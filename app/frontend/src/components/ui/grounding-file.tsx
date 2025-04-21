import { File } from "lucide-react";
import { useState } from "react";

import { Button } from "./button";

import { GroundingFile as GroundingFileType } from "@/types";

type Properties = {
    value: GroundingFileType;
    onClick: () => void;
};

export default function GroundingFile({ value, onClick }: Properties) {
    const [jsonData, setJsonData] = useState<Record<string, any> | null>(null);
    const [headerName, setHeaderName] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleButtonClick = () => {
        setHeaderName(value.name);
        if (value.name.endsWith(".json")) {
            try {
                const parsedData = JSON.parse(value.content); // Assuming `value.content` contains the JSON string
                setJsonData(parsedData);
                setHeaderName(parsedData.name);
                setIsModalOpen(true); // Open the modal
            } catch (error) {
                console.error("Invalid JSON content", error);
            }
        } else {
            onClick();
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setJsonData(null); // Clear JSON data when closing the modal
    };

    return (
        <div>
            <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleButtonClick}
            >
                <File className="mr-2 h-4 w-4" />
                {value.name}
            </Button>


            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                        <h2 className="text-lg font-medium mb-4">{headerName}</h2>
                        <div className="max-h-64 overflow-y-auto space-y-3 text-sm text-gray-800">
                            {jsonData && (
                                <div>
                                    <p><strong>Client ID:</strong> {jsonData.clientId}</p>
                                    <p><strong>Name:</strong> {jsonData.name}</p>
                                    <p><strong>Address:</strong> {jsonData.address}</p>

                                    <div className="mt-3">
                                        <p className="font-semibold">Care Plan Preferences:</p>
                                        <ul className="list-disc ml-5">
                                            <li><strong>Tea:</strong> {jsonData.carePlan.preferences.tea}</li>
                                            <li><strong>Mobility:</strong> {jsonData.carePlan.preferences.mobility}</li>
                                            <li><strong>Language:</strong> {jsonData.carePlan.preferences.language}</li>
                                        </ul>
                                    </div>

                                    <div className="mt-3">
                                        <p className="font-semibold">Medical History:</p>
                                        <ul className="list-disc ml-5">
                                            {jsonData.carePlan.medicalHistory.map((item: string, idx: number) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-3">
                                        <p className="font-semibold">Task Instructions for {jsonData.taskInstructions.visitDate}:</p>
                                        <ul className="list-disc ml-5">
                                            {jsonData.taskInstructions.tasks.map((task: string, idx: number) => (
                                                <li key={idx}>{task}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-3">
                                        <p className="font-semibold">Last Visit Notes:</p>
                                        <ul className="list-disc ml-5">
                                            {jsonData.lastVisitNotes.map((entry: any, idx: number) => (
                                                <li key={idx}>
                                                    <strong>{entry.date}:</strong> {entry.notes}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={closeModal}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
