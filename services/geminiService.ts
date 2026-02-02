
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseStudentFile = async (base64Data: string, mimeType: string): Promise<{ name: string; externalId: string }[]> => {
  const modelName = "gemini-3-flash-preview";
  
  const promptText = `
    Analiza este documento que contiene una lista de estudiantes.
    Extrae los nombres completos de los estudiantes y sus números de identificación si están presentes.
    Limpia los nombres de caracteres especiales extraños.
    Devuelve los datos en un formato de arreglo JSON estructurado.
  `;

  try {
    const dataPart = {
      inlineData: {
        data: base64Data.split(',')[1] || base64Data,
        mimeType: mimeType
      }
    };

    const textPart = { text: promptText };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [dataPart, textPart]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { 
                type: Type.STRING, 
                description: "Nombre completo del estudiante" 
              },
              externalId: { 
                type: Type.STRING, 
                description: "ID o Matrícula" 
              }
            },
            required: ["name", "externalId"],
            propertyOrdering: ["name", "externalId"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    return JSON.parse(resultText.trim());
  } catch (error) {
    console.error("Gemini AI parse error:", error);
    return [];
  }
};
