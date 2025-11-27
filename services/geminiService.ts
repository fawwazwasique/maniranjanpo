
import { GoogleGenAI, Type } from "@google/genai";
import { POItem, ProcurementSuggestion } from '../types';

export const getProcurementSuggestion = async (item: POItem): Promise<ProcurementSuggestion | null> => {
    // This check is important because process.env is a Vite/Next.js feature.
    // In a pure client-side setup without a build tool, you'd handle API keys differently.
    // For this project, we assume the environment variable is available.
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        // Mock response for development if API key is not available
        return {
            supplier_types: ["Wholesale Electronics Distributor", "Specialty Component Manufacturer"],
            negotiation_tactics: ["Bulk purchase discount", "Long-term supply contract"],
            lead_time_considerations: ["Check for international shipping delays", "Confirm stock levels before ordering"]
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Provide a procurement strategy for the following item: Part Number: ${item.partNumber}, Quantity Required: ${item.quantity}. Suggest potential supplier types, key negotiation tactics, and important lead time considerations.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        supplier_types: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "List of potential supplier types (e.g., manufacturer, distributor)."
                        },
                        negotiation_tactics: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Key negotiation points to consider."
                        },
                        lead_time_considerations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Factors that could affect delivery time."
                        }
                    },
                    required: ["supplier_types", "negotiation_tactics", "lead_time_considerations"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        const suggestion: ProcurementSuggestion = JSON.parse(jsonText);
        return suggestion;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching procurement suggestion from Gemini API:", errorMessage);
        return null;
    }
};
