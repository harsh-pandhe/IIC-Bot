// ingest.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
// We use the official LangChain PDF loader now (safer/easier)
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const run = async () => {
    console.log("🚀 Starting ingestion...");

    // 1. Initialize Pinecone
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

    // 2. Read PDF Files from 'documents' folder
    const docsPath = path.join(__dirname, 'documents');

    if (!fs.existsSync(docsPath)) {
        console.error("❌ Error: 'documents' folder not found. Please create it and add your PDFs!");
        return;
    }

    const files = fs.readdirSync(docsPath);
    let allDocs = [];
    let filesFound = false;

    // Text splitter for chunking
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    for (const file of files) {
        if (file.endsWith('.pdf')) {
            console.log(`📄 Processing ${file}...`);
            const filePath = path.join(docsPath, file);

            try {
                // Use LangChain PDFLoader
                const loader = new PDFLoader(filePath);
                const docs = await loader.load();

                // Combine all pages of this PDF
                const pdfText = docs.map(doc => doc.pageContent).join('\n');

                // Split into chunks
                const chunks = await splitter.createDocuments([pdfText]);

                // Add source metadata to each chunk
                const chunksWithMetadata = chunks.map(chunk => ({
                    pageContent: chunk.pageContent,
                    metadata: {
                        source: file,
                        fileName: file.replace('.pdf', '')
                    }
                }));

                allDocs.push(...chunksWithMetadata);
                filesFound = true;
                console.log(`   ✓ Created ${chunksWithMetadata.length} chunks from ${file}`);
            } catch (err) {
                console.error(`❌ Failed to parse ${file}:`, err.message);
            }
        }
    }

    if (!filesFound) {
        console.error("❌ No PDF files found in 'documents' folder.");
        return;
    }

    console.log(`\n📊 Total chunks: ${allDocs.length}. Generating embeddings...`);

    // 4. Store in Pinecone
    try {
        await PineconeStore.fromDocuments(allDocs, new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACEHUB_API_TOKEN,
            model: "BAAI/bge-base-en-v1.5" // Forces 768 dimensions
        }), {
            pineconeIndex,
            maxConcurrency: 5,
        });

        console.log("✅ Data successfully uploaded to Pinecone with source metadata!");
    } catch (error) {
        console.error("❌ Error uploading to Pinecone:", error);
    }
};

run().catch(console.error);