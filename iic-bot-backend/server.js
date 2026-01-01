// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { ChatGroq } = require('@langchain/groq');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize AI Components
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

// Forces 768 dimensions to match your DB
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_TOKEN,
    model: "BAAI/bge-base-en-v1.5"
});

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    temperature: 0,
});

app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        console.log(`Received question: ${question}`);

        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
        const results = await vectorStore.similaritySearch(question, 3);

        // Debug: Log metadata to see structure
        console.log("Results metadata:", results.map(r => r.metadata));

        const context = results.map(r => r.pageContent).join('\n\n');

        // Extract unique source filenames from metadata
        const sources = [...new Set(results.map(r => {
            const meta = r.metadata || {};
            return meta.source || meta.fileName || meta.pdf || meta.file || "Unknown Document";
        }))];

        console.log("Extracted sources:", sources);

        const promptTemplate = PromptTemplate.fromTemplate(`
      You are the **Strict Compliance Officer** for IIC (Institution's Innovation Council).
      
      CRITICAL RULES:
      - Answer ONLY based on the SOP context provided below. Do NOT provide general advice.
      - If a rule was violated, state the **exact rule** and the **penalty** in bold.
      - Always identify the **specific role** responsible (e.g., Student President, Technical Head).
      - If the answer is not in the context, respond: "⚠️ I cannot find a specific rule for this in the SOPs."
      - Be professional, authoritative, and concise.
      - Format your response with clear structure using bullet points or numbered lists.
      
      ═══════════════════════════════════════
      📋 SOP CONTEXT:
      {context}
      ═══════════════════════════════════════
      
      ❓ USER QUESTION: 
      {question}
      
      📝 YOUR VERDICT:
    `);

        const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);
        const response = await chain.invoke({ context, question });

        // Send response with sources
        res.json({
            answer: response,
            sources: sources
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error processing request" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));