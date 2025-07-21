import logging
import os
import base64

from pathlib import Path
from aiohttp import web
from azure.core.credentials import AzureKeyCredential
from azure.identity import AzureDeveloperCliCredential, DefaultAzureCredential
from azure.identity import ManagedIdentityCredential
from azure.core.exceptions import ClientAuthenticationError
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
from azure.cosmos import CosmosClient
from setup_intvect import upload_documents  # Import the function

from ragtools import attach_rag_tools
from rtmt import RTMiddleTier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voicerag")

print("🧠 Running app.py from:", __file__)

# Helper to get credential based on environment
def get_azure_credential():
    if os.environ.get("RUNNING_IN_PRODUCTION"):
        return ManagedIdentityCredential()
    else:
        return DefaultAzureCredential(exclude_developer_cli_credential=True)

async def sample_handler(request):
    return web.json_response({"status": "success", "message": "Sample response"})

async def create_app():
    print("🛠️ create_app() is being called")

    if not os.environ.get("RUNNING_IN_PRODUCTION"):
        logger.info("Running in development mode, loading from .env file")
        # Explicitly load the .env file from the .azure environment directory
        dotenv_path = Path(__file__).parent.parent.parent / ".azure" / "az-openai-rag-audio-hammond-care-dev" / ".env"
        load_dotenv(dotenv_path)

    llm_key = os.environ.get("AZURE_OPENAI_API_KEY")
    search_key = os.environ.get("AZURE_SEARCH_API_KEY")

    credential = None
    if not llm_key or not search_key:
        if tenant_id := os.environ.get("AZURE_TENANT_ID"):
            logger.info("Using AzureDeveloperCliCredential with tenant_id %s", tenant_id)
            credential = AzureDeveloperCliCredential(tenant_id=tenant_id, process_timeout=60)
        else:
            logger.info("Using DefaultAzureCredential")
            credential = DefaultAzureCredential()
    llm_credential = AzureKeyCredential(llm_key) if llm_key else credential
    search_credential = AzureKeyCredential(search_key) if search_key else credential
    
    app = web.Application()

    rtmt = RTMiddleTier(
        credentials=llm_credential,
        endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", "https://oai-aue-aiagents-dev-01.openai.azure.com/"),
        deployment=os.environ.get("AZURE_OPENAI_REALTIME_DEPLOYMENT", "gpt-4o-realtime-preview"),
        voice_choice=os.environ.get("AZURE_OPENAI_REALTIME_VOICE_CHOICE") or "alloy"
        )
    rtmt.system_message = """
        You are a helpful assistant. Only answer questions based on information you searched in the knowledge base, accessible with the 'search' tool. 
        The user is listening to answers with audio, so it's *super* important that answers are as short as possible, a single sentence if at all possible. 
        Never read file names or source names or keys out loud. 
        Always use the following step-by-step instructions to respond: 
        1. Always use the 'search' tool to check the knowledge base before answering a question. 
        2. Always use the 'report_grounding' tool to report the source of information from the knowledge base. 
        3. Produce an answer that's as short as possible. If the answer isn't in the knowledge base, say you don't know.
    """.strip()

    attach_rag_tools(rtmt,
        credentials=search_credential,
        search_endpoint=os.environ.get("AZURE_SEARCH_ENDPOINT"),
        search_index=os.environ.get("AZURE_SEARCH_INDEX"),
        semantic_configuration=os.environ.get("AZURE_SEARCH_SEMANTIC_CONFIGURATION") or None,
        identifier_field=os.environ.get("AZURE_SEARCH_IDENTIFIER_FIELD") or "chunk_id",
        content_field=os.environ.get("AZURE_SEARCH_CONTENT_FIELD") or "chunk",
        embedding_field=os.environ.get("AZURE_SEARCH_EMBEDDING_FIELD") or "text_vector",
        title_field=os.environ.get("AZURE_SEARCH_TITLE_FIELD") or "title",
        use_vector_query=(os.environ.get("AZURE_SEARCH_USE_VECTOR_QUERY") == "true") or True
        )

    rtmt.attach_to_app(app, "/realtime")
    app['rtmt'] = rtmt
    current_directory = Path(__file__).parent
   

    # Add WebSocket route
    app.router.add_route('GET', '/ws', websocket_handler)
    app.router.add_route("POST", "/api/upload-chunk", upload_chunk_handler)
    app.router.add_route("POST", "/api/commit-upload", commit_upload_handler)
    app.router.add_route("GET", "/api/fetch-files", fetch_files_handler)
    app.router.add_route("DELETE", "/api/delete-file", delete_file_handler)
    app.router.add_route("GET", "/api/sample", sample_handler)
    app.router.add_route("GET", "/api/download-file", download_file_handler)
    app.router.add_route("POST", "/api/reindex", reindex_handler)
    app.router.add_route("GET", "/api/get-instruction", get_instruction_handler)
    app.router.add_route("POST", "/api/insert-instruction", insert_instruction_handler)
    app.router.add_route("POST", "/api/update-system-message", update_system_message_handler)

    app.add_routes([web.get('/', lambda _: web.FileResponse(current_directory / 'static/index.html'))])
    app.router.add_static('/', path=current_directory / 'static', name='static')

    for route in app.router.routes():
        print("🔍 Route:", route.method, route.resource)
    
    return app

# WebSocket handler
async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            data = msg.json()
            try:
                response = rtmt.handle_message(data)
                await ws.send_json(response)
            except ValueError as e:
                await ws.send_json({"status": "error", "message": str(e)})
        elif msg.type == web.WSMsgType.ERROR:
            logger.error(f"WebSocket connection closed with exception {ws.exception()}")

    logger.info("WebSocket connection closed")
    return ws

# New route to trigger indexer only
async def upload_chunk_handler(request):
    try:
        reader = await request.multipart()

        block_id = None
        file_name = None
        chunk_data = None

        while True:
            field = await reader.next()
            if not field:
                break
            if field.name == "blockId":
                block_id = await field.text()
            elif field.name == "fileName":
                file_name = await field.text()
            elif field.name == "chunk":
                chunk_data = await field.read()

        if not block_id or not file_name or not chunk_data:
            return web.json_response({"status": "error", "message": "Missing required fields"}, status=400)

        # Use storage connection string instead of endpoint/credential
        storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        if not storage_connection_string:
            return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
        storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")

        blob_service_client = BlobServiceClient.from_connection_string(storage_connection_string)
        container_client = blob_service_client.get_container_client(storage_container)
        blob_client = container_client.get_blob_client(file_name)

        encoded_block_id = base64.b64encode(block_id.encode()).decode()
        blob_client.stage_block(block_id=encoded_block_id, data=chunk_data)

        return web.json_response({"status": "success", "blockId": block_id})
    except Exception as e:
        import traceback
        print("UPLOAD ERROR:", traceback.format_exc())
        return web.json_response({"status": "error", "message": str(e)}, status=500)
    
async def commit_upload_handler(request):
    data = await request.json()
    file_name = data.get("fileName")
    block_ids = data.get("blockIds", [])
    storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    
    if not storage_connection_string:
        return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
    storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")

    if not file_name or not block_ids:
        return web.json_response({"status": "error", "message": "Missing fileName or blockIds"}, status=400)

    blob_service_client = BlobServiceClient.from_connection_string(storage_connection_string)
    container_client = blob_service_client.get_container_client(storage_container)
    blob_client = container_client.get_blob_client(file_name)

    encoded_ids = [base64.b64encode(b.encode()).decode() for b in block_ids]
    blob_client.commit_block_list(encoded_ids)

    # Trigger indexing immediately after commit
    search_key = os.environ.get("AZURE_SEARCH_API_KEY")
    if not search_key:
        return web.json_response({"status": "error", "message": "Missing AZURE_SEARCH_API_KEY env var"}, status=500)
    from azure.core.credentials import AzureKeyCredential
    search_credential = AzureKeyCredential(search_key)
    upload_documents(
        azure_search_credential=search_credential,
        indexer_name=os.environ.get("AZURE_SEARCH_INDEX"),
        azure_search_endpoint=os.environ.get("AZURE_SEARCH_ENDPOINT"),
        azure_storage_connection_string=storage_connection_string,
        azure_storage_container=storage_container,
        skip_local_upload=True
    )

    return web.json_response({"status": "success", "message": f"{file_name} upload and indexing complete."})

async def fetch_files_handler(request):
    try:
        # Use storage connection string
        storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")

        if not storage_connection_string:
            return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
        storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")

        blob_service_client = BlobServiceClient.from_connection_string(storage_connection_string)
        container_client = blob_service_client.get_container_client(storage_container)

        file_list = []
        for blob in container_client.list_blobs():
            file_list.append({
                "name": blob.name,
                "last_modified": blob.last_modified.isoformat() if hasattr(blob, 'last_modified') else None,
                "size": blob.size if hasattr(blob, 'size') else None
            })

        return web.json_response({"status": "success", "files": file_list})
    except Exception as e:
        import traceback
        print("FETCH FILES ERROR:", traceback.format_exc())
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def delete_file_handler(request):
    try:
        file_name = request.query.get('name')
        if not file_name:
            return web.json_response({"status": "error", "message": "File name is required"}, status=400)

        # Use storage connection string
        storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")

        if not storage_connection_string:
            return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
        storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")

        blob_service_client = BlobServiceClient.from_connection_string(storage_connection_string)
        container_client = blob_service_client.get_container_client(storage_container)
        blob_client = container_client.get_blob_client(file_name)
        blob_client.delete_blob(delete_snapshots="include")

        # Also delete from Azure Search index
        from azure.search.documents import SearchClient
        azure_search_index = os.environ.get("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT")
        search_key = os.environ.get("AZURE_SEARCH_API_KEY")
        credential = get_azure_credential()
        if search_key:
            search_credential = AzureKeyCredential(search_key)
        else:
            search_credential = credential
        search_client = SearchClient(azure_search_endpoint, azure_search_index, search_credential)
        # Find all documents with the given title and delete by chunk_id
        results = search_client.search(f"title eq '{file_name}'")
        chunk_ids = [doc['chunk_id'] for doc in results]
        if chunk_ids:
            docs_to_delete = [{"chunk_id": cid} for cid in chunk_ids]
            search_client.delete_documents(docs_to_delete)

        return web.json_response({"status": "success", "message": f"File {file_name} deleted successfully"})
    except Exception as e:
        import traceback
        print("DELETE FILE ERROR:", traceback.format_exc())
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def download_file_handler(request):
    file_name = request.query.get('name')
    if not file_name:
        return web.json_response({"status": "error", "message": "File name is required"}, status=400)

    # Use storage connection string
    storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")

    if not storage_connection_string:
        return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
    storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")

    blob_service_client = BlobServiceClient.from_connection_string(storage_connection_string)
    container_client = blob_service_client.get_container_client(storage_container)
    blob_client = container_client.get_blob_client(file_name)

    try:
        stream = blob_client.download_blob()
        data = stream.readall()
        return web.Response(
            body=data,
            headers={
                'Content-Disposition': f'attachment; filename="{file_name}"',
                'Content-Type': 'application/octet-stream'
            }
        )
    except Exception as e:
        import traceback
        print("DOWNLOAD FILE ERROR:", traceback.format_exc())
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def reindex_handler(request):
    try:
        storage_connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")

        storage_container = os.environ.get("AZURE_STORAGE_CONTAINER", "content")
        azure_search_index = os.environ.get("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT")
        search_key = os.environ.get("AZURE_SEARCH_API_KEY")
        if not storage_connection_string:
            return web.json_response({"status": "error", "message": "Missing AZURE_STORAGE_CONNECTION_STRING env var"}, status=500)
        if not search_key:
            return web.json_response({"status": "error", "message": "Missing AZURE_SEARCH_API_KEY env var"}, status=500)
        from azure.core.credentials import AzureKeyCredential
        search_credential = AzureKeyCredential(search_key)
        from setup_intvect import upload_documents

        file_name = request.query.get('name')
        if not file_name and request.can_read_body:
            try:
                data = await request.json()
                file_name = data.get("name")
            except Exception:
                file_name = None

        upload_documents(
            azure_search_credential=search_credential,
            indexer_name=azure_search_index,
            azure_search_endpoint=azure_search_endpoint,
            azure_storage_connection_string=storage_connection_string,
            azure_storage_container=storage_container,
            skip_local_upload=True,
            file_name=file_name
        )
        msg = f"Reindex triggered for {file_name}" if file_name else "Reindex triggered."
        return web.json_response({"status": "success", "message": msg})
    except Exception as e:
        import traceback
        print("REINDEX ERROR:", traceback.format_exc())
        return web.json_response({"status": "error", "message": str(e)}, status=500)
    
async def get_instruction_handler(request) :
    """
    Fetch the latest instruction record from the 'Instructions' container in CosmosDB.
    Returns only the latest record with properties: id, details, createdBy, createdDate, updatedBy, updatedDate.
    Partition key is 'Id'.
    """
    # CosmosDB connection details (replace with env vars as needed)
    url = os.environ.get("COSMOSDB_URL") 
    key = os.environ.get("COSMOSDB_KEY")
    db_name = os.environ.get("COSMOSDB_DB")
    container_name = 'Instructions'
    client = CosmosClient(url, credential=key)
    db = client.get_database_client(db_name)
    container = db.get_container_client(container_name)

    # Query items for the given SiteName using CONTAINS for partial match
    query = f"SELECT * FROM c"
    items = list(container.query_items(
        query=query,
        enable_cross_partition_query=True
    ))
    if not items:
        return web.json_response({"error": f"No instruction records found"}, status=404)
    def get_date(item):
        # Try all possible date field names, prefer updatedDate/UpdatedDate, then createdDate/CreatedDate
        return (
            item.get("updatedDate") or
            item.get("UpdatedDate") or
            item.get("createdDate") or
            item.get("CreatedDate") or
            ""
        )
    latest_item = max(items, key=get_date)
    result = {
        "id": latest_item.get("id"),
        "details": latest_item.get("details"),
        "createdBy": latest_item.get("createdBy"),
        "createdDate": latest_item.get("createdDate") or latest_item.get("CreatedDate"),
        "updatedBy": latest_item.get("updatedBy") or latest_item.get("UpdatedBy"),
        "updatedDate": latest_item.get("updatedDate") or latest_item.get("UpdatedDate"),
    }
    return web.json_response(result)

async def insert_instruction_handler(request) :
    """
    Insert a new instruction record into the 'Instructions' container in CosmosDB.
    Expects JSON body with at least 'details' and 'createdBy'.
    Automatically sets id, createdDate, updatedBy, updatedDate.
    Partition key is 'Id'.
    """
    from datetime import datetime, timezone
    import uuid
    url = os.environ.get("COSMOSDB_URL") 
    key = os.environ.get("COSMOSDB_KEY")
    db_name = os.environ.get("COSMOSDB_DB")
    container_name = 'Instructions'
    client = CosmosClient(url, credential=key)
    db = client.get_database_client(db_name)
    container = db.get_container_client(container_name)

    data = await request.json()
    details = data.get("details")
    created_by = data.get("userEmail")
    if not details or not created_by:
        return web.json_response({"error": "'details' and 'createdBy' are required."}, status=400)

    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    item = {
        "id": new_id,
        "Id": new_id,  # Partition key
        "details": details,
        "createdBy": created_by,
        "createdDate": now,
        "updatedBy": created_by,
        "updatedDate": now
    }
    try:
        created = container.create_item(body=item)
        # After inserting, update the in-memory system prompt
        from aiohttp import ClientSession
        # backend_url = os.environ.get("BACKEND_URL", "http://localhost:8765") 
        backend_url = os.environ.get("BACKEND_URL", "https://ca-aue-aiagents-dev-01.lemonhill-09657cf3.australiaeast.azurecontainerapps.io") 
        async with ClientSession() as session:
            await session.post(f"{backend_url}/api/update-system-message")
        return web.json_response({"status": "created", "item": created})
    except Exception as e:
        return web.json_response({"error": f"CosmosDB create_item failed: {str(e)}", "data": item}, status=500)


async def update_system_message_handler(request):
    """
    Update the in-memory system prompt (rtmt.system_message) with the latest instruction from CosmosDB.
    Can be called after a new instruction is inserted.
    """
    try:
        url = os.environ.get("COSMOSDB_URL") 
        key = os.environ.get("COSMOSDB_KEY")
        db_name = os.environ.get("COSMOSDB_DB")
        container_name = 'Instructions'
        client = CosmosClient(url, credential=key)
        db = client.get_database_client(db_name)
        container = db.get_container_client(container_name)
        
        # Query for the latest instruction for the given SiteName
        query = f"SELECT * FROM c"
        items = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        if items:
            def get_date(item):
                return (
                    item.get("updatedDate") or
                    item.get("UpdatedDate") or
                    item.get("createdDate") or
                    item.get("CreatedDate") or
                    ""
                )
            latest_item = max(items, key=get_date)
            latest_instruction = latest_item.get("details")
            if latest_instruction:
                rtmt = request.app['rtmt']
                rtmt.system_message = latest_instruction
                return web.json_response({"status": "updated", "system_message": latest_instruction})
        return web.json_response({"error": f"No instruction found"}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)



if __name__ == "__main__":
    if os.environ.get("RUNNING_IN_PRODUCTION"):
        port = int(os.environ.get("PORT", 80))  # Azure expects PORT=80
        web.run_app(create_app(), host="0.0.0.0", port=port)
    else:
        host = "localhost"
        port = 8765
        web.run_app(create_app(), host=host, port=port)