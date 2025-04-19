import os
import argparse
from PyPDF2 import PdfReader
from openai import OpenAI
import tiktoken
from tqdm import tqdm
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
import re

load_dotenv()

class PdfSummarizer:
    def __init__(self, api_key=None, model="gpt-4o", max_tokens=8192, overlap=200, max_workers=5):
        self.model = model
        self.max_tokens = max_tokens
        self.overlap = overlap
        self.max_workers = max_workers
        
        api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found")
        
        self.client = OpenAI(api_key=api_key)
        
        self.encoding = tiktoken.encoding_for_model(model)
    
    def extract_text_from_pdf(self, pdf_path):
        try:
            reader = PdfReader(pdf_path)

            return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {e}")
    
    def split_into_chunks(self, text, method="sentence"):
        tokens = self.encoding.encode(text)
        
        if len(tokens) <= self.max_tokens - 1500:
            return [text]
        
        if method == "sentence":
            sentences = re.split(r'(?<=[.!?])\s+', text)
            chunks, current_chunk = [], ""
            current_tokens = 0

            for sentence in sentences:
                sentence_tokens = self.encoding.encode(sentence)
                if current_tokens + len(sentence_tokens) > self.max_tokens - 1500:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                    current_tokens = len(sentence_tokens)
                else:
                    current_chunk += " " + sentence if current_chunk else sentence
                    current_tokens += len(sentence_tokens)

            if current_chunk:
                chunks.append(current_chunk.strip())
        else:
            # Token-based chunking with overlap
            chunks = []
            start_idx = 0
            
            while start_idx < len(tokens):
                # Calculate end index for current chunk
                end_idx = min(start_idx + self.max_tokens - 1500, len(tokens))
                # Decode token subset back to text
                chunk_tokens = tokens[start_idx:end_idx]
                chunk_text = self.encoding.decode(chunk_tokens)
                chunks.append(chunk_text)
                
                # Move start index for next chunk, considering overlap
                start_idx = end_idx - self.overlap
        
        return chunks
    
    def summarize_chunk(self, chunk, is_first=False, is_last=False):
        if is_first and is_last:
            prompt = f"""
            Please summarize the following research paper. Cover the key findings, methodology, 
            and conclusions. Maintain academic language and focus on the most important details.
            
            Research paper:
            {chunk}
            """
        elif is_first:
            prompt = f"""
            This is the beginning of a research paper. Please summarize this part focusing on the 
            introduction, research objectives, and initial methodology. This is part of a larger paper
            that will be summarized separately.
            
            Research paper beginning:
            {chunk}
            """
        elif is_last:
            prompt = f"""
            This is the final part of a research paper. Please summarize this part focusing on 
            the final results, discussion, and conclusion. Connect to the earlier parts if possible.
            
            Research paper ending:
            {chunk}
            """
        else:
            prompt = f"""
            This is a middle part of a research paper. Please summarize the key information, findings,
            and methodology described in this section. This is part of a larger paper.
            
            Research paper section:
            {chunk}
            """
            
        try:
            # Updated API call for OpenAI SDK 1.0.0+
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a research assistant that creates concise yet comprehensive summaries of academic papers."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error calling OpenAI API: {e}")
    
    #compile chunks
    def compile_summary(self, chunk_summaries):
        if len(chunk_summaries) == 1:
            return chunk_summaries[0]
        
        combined_summary = "\n\n".join([f"Chunk {i+1} Summary:\n{summary}" for i, summary in enumerate(chunk_summaries)])
        
        prompt = f"""
        Below are summaries of different parts of a research paper. Please synthesize these summaries
        into a coherent, comprehensive summary of the entire paper. Eliminate redundancies and organize
        the information logically. Focus on the research question, methodology, key findings, and conclusions.
        
        {combined_summary}
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a research assistant that creates cohesive summaries from partial summaries of academic papers."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error calling OpenAI API for final summary: {e}")
    
    def summarize_pdf(self, pdf_path, output_path=None, chunk_method="sentence", parallel=True):
        #extract text
        print(f"Extracting text from {pdf_path}...")
        text = self.extract_text_from_pdf(pdf_path)
        
        #total count
        tokens = self.encoding.encode(text)
        token_count = len(tokens)
        print(f"Extracted {token_count:,} tokens from PDF")
        
        #split chunks
        print(f"Splitting text into chunks using {chunk_method}-based chunking...")
        chunks = self.split_into_chunks(text, method=chunk_method)
        print(f"Split into {len(chunks)} chunks")
        
        #summarize chunks
        print(f"Summarizing chunks{' in parallel' if parallel else ''}...")
        chunk_summaries = []
        
        if parallel and len(chunks) > 1:
            with ThreadPoolExecutor(max_workers=min(self.max_workers, len(chunks))) as executor:
                futures = [
                    executor.submit(self.summarize_chunk, chunk, i == 0, i == len(chunks) - 1)
                    for i, chunk in enumerate(chunks)
                ]
                for future in tqdm(futures):
                    chunk_summaries.append(future.result())
        else:
            for i, chunk in enumerate(tqdm(chunks)):
                is_first = (i == 0)
                is_last = (i == len(chunks) - 1)
                summary = self.summarize_chunk(chunk, is_first, is_last)
                chunk_summaries.append(summary)
        
        #compile final
        print("Compiling final summary...")
        final_summary = self.compile_summary(chunk_summaries)
        
        #save to file
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_summary)
            print(f"Summary saved to {output_path}")
        
        return final_summary

def main():
    parser = argparse.ArgumentParser(description='Summarize a research paper PDF using OpenAI')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('--output', '-o', help='Path to save the summary (optional)')
    parser.add_argument('--model', '-m', default='gpt-4o', help='OpenAI model to use (default: gpt-4o)')
    parser.add_argument('--chunk-method', '-c', choices=['sentence', 'token'], default='sentence', 
                        help='Method for chunking text (default: sentence)')
    parser.add_argument('--sequential', '-s', action='store_true', 
                        help='Process chunks sequentially instead of in parallel')
    parser.add_argument('--api-key', help='OpenAI API key (alternative to environment variable)')
    parser.add_argument('--max-workers', type=int, default=5, 
                        help='Maximum number of parallel workers (default: 5)')
    args = parser.parse_args()
    
    #apikey
    api_key = args.api_key or os.environ.get("OPENAI_API_KEY")
    
    try:
        # Create summarizer and process PDF
        summarizer = PdfSummarizer(api_key=api_key, model=args.model, max_workers=args.max_workers)
        summary = summarizer.summarize_pdf(
            args.pdf_path, 
            args.output,
            chunk_method=args.chunk_method,
            parallel=not args.sequential
        )
        
        if not args.output:
            print("\nSummary:\n")
            print(summary)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()