import os
import argparse
from PyPDF2 import PdfReader
from openai import OpenAI
import tiktoken
from tqdm import tqdm
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
import re
import json

load_dotenv()

MATH_INJECTION = (
    "Whenever you mention any mathematical expression—complexities, equations, Greek letters, "
    "sums, integrals, subscripts/superscripts—wrap it in LaTeX delimiters: `$...$` for inline math "
    "and `$$...$$` for display math.\n\n"
)

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
    
    def summarize_chunk(self, chunk, is_first=False, is_last=False, detailed=False):
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
            system_msg = MATH_INJECTION + (
                "You are a research assistant that creates concise yet comprehensive summaries of academic papers."
                if not detailed
                else
                "You are a research assistant that creates comprehensive summaries of academic papers with detailed breakdowns "
                "of each subtopic and concept within the research paper for complete beginners."
            )
            # Updated API call for OpenAI SDK 1.0.0+
            if not detailed:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1500
                )
                return response.choices[0].message.content
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": f"For any summary, extract keywords and give a long detailed explanation for every keyword for someone with no background knowledge. {prompt}"}
                    ],
                    temperature=0.3,
                    max_tokens=5000
                )
                return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error calling OpenAI API: {e}")
    
    #compile chunks
    def compile_summary(self, chunk_summaries, detailed=False, include_citations=False):
        if len(chunk_summaries) == 1:
            return chunk_summaries[0]
        
        combined_summary = "\n\n".join([f"Chunk {i+1} Summary:\n{summary}" for i, summary in enumerate(chunk_summaries)])

        citation_instruction = ""
        if include_citations:
            # Prepare a list of extracted reference information for citation
            references_info = []
            # This will be populated later in the summarize_pdf method
            if hasattr(self, 'extracted_references') and self.extracted_references:
                # Process up to 25 references to avoid token limits
                for ref in self.extracted_references[:25]:
                    # Try to extract author and year information
                    author_year = self._extract_author_year_from_reference(ref)
                    if author_year:
                        references_info.append(author_year)
            
            if references_info:
                # Define newline character outside the f-string to avoid backslash in expression
                newline = '\n'
                citation_instruction = f"""
                Include relevant citations in the format [Author, Year] throughout the summary when referencing specific findings or claims.
                
                Here are some of the references from the paper - use these for accurate citations:
                {newline.join(references_info)}
                
                Make sure each citation actually relates to the claim it's supporting. Use the format [Author, Year] consistently with a comma between the author name and year.
                Do not add emojis or extra characters in citations. Keep citations simple and academic.
                """
            else:
                citation_instruction = "Include relevant citations in the format [Author, Year] throughout the summary when referencing specific findings or claims. Use the exact author names and years from the paper, with a comma between the author name and year. Avoid any extra characters in citations."
        
        if not detailed:
            prompt = f"""
            Below are summaries of different parts of a research paper. Please synthesize these summaries
            into a coherent, comprehensive summary of the entire paper. Eliminate redundancies and organize
            the information logically. Focus on the research question, methodology, key findings, and conclusions.
            {citation_instruction}
            
            {combined_summary}
            """
        else:
            prompt = f"""
            Below are detailed summaries of different parts of a research paper with detailed explanation of concepts. Please synthesize these summaries
            into a coherent summary of the entire paper and make sure to add extensive detail about every subtopic and concept. Eliminate redundancies and organize
            the information logically. Focus on extracting key words and giving long detailed explanation about every single keyword. Do not include titles, 
            make it flow like a very detailed human-written summary written for someone with no background knowledge on the topic.
            {citation_instruction}
            
            {combined_summary}
            """
        
        try:
            system_msg = MATH_INJECTION + (
                "You are a research assistant that creates cohesive summaries from partial summaries of academic papers."
                if not detailed
                else
                "You are a research assistant that creates cohesive summaries from partial summaries of academic papers "
                "with detailed breakdowns of each subtopic and concept within the research paper for complete beginners."
            )

            if not detailed: 
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=2000
                )
                return response.choices[0].message.content
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=10000
                )
                return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error calling OpenAI API for final summary: {e}")
    
    def summarize_pdf(self, pdf_path, output_path=None, chunk_method="sentence", parallel=True, detailed=False, include_citations=False):
        #extract text
        print(f"Extracting text from {pdf_path}...")
        text = self.extract_text_from_pdf(pdf_path)
        
        #total count
        tokens = self.encoding.encode(text)
        token_count = len(tokens)
        print(f"Extracted {token_count:,} tokens from PDF")
        
        # If we need citations, extract references first
        if include_citations:
            print("Extracting references for citations...")
            self.extracted_references = self.extract_references(text)
            print(f"Found {len(self.extracted_references)} references")
        else:
            self.extracted_references = []
        
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
                    executor.submit(self.summarize_chunk, chunk, i == 0, i == len(chunks) - 1, detailed)
                    for i, chunk in enumerate(chunks)
                ]
                for future in tqdm(futures):
                    chunk_summaries.append(future.result())
        else:
            for i, chunk in enumerate(tqdm(chunks)):
                is_first = (i == 0)
                is_last = (i == len(chunks) - 1)
                summary = self.summarize_chunk(chunk, is_first, is_last, detailed)
                chunk_summaries.append(summary)
        
        #compile final
        print("Compiling final summary...")
        final_summary = self.compile_summary(chunk_summaries, detailed, include_citations)
        
        #save to file
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_summary)
            print(f"Summary saved to {output_path}")
        
        return final_summary

    def extract_references(self, text):
        """
        Extract references from the text using a regex pattern or sending to OpenAI
        Returns a list of reference strings
        """
        try:
            # First try to find a references section
            references_section = re.search(r'(?:References|Bibliography|Works Cited)(?:\s*\n)+([\s\S]+?)(?:\n\s*\n|\Z)', text, re.IGNORECASE)
            
            if references_section:
                # If references section is found, extract references
                raw_references = references_section.group(1)
                # Split by common reference patterns (numbered or author patterns)
                ref_items = re.split(r'(?:\[\d+\]|\d+\.|^\s*[A-Z][a-zA-Z,\.\s&]+?\s*\(\d{4}\))', raw_references)
                # Clean up and filter empty items
                references = [ref.strip() for ref in ref_items if ref.strip()]
                
                if references:
                    return references
            
            # If simple extraction fails, use OpenAI to extract references
            prompt = f"Extract all references from the following text. Format each reference on a new line, do not number them:\n\n{text[-20000:]}"
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": "You are a reference extraction assistant."},
                         {"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3
            )
            
            extracted_refs = response.choices[0].message.content.strip().split('\n')
            return [ref.strip() for ref in extracted_refs if ref.strip()]
            
        except Exception as e:
            print(f"Error extracting references: {e}")
            return []
            
    def extract_keywords(self, text):
        """
        Extract keywords from the document using OpenAI
        Returns a list of keyword dictionaries with keyword, score and explanation
        """
        try:
            # Take the first 10000 tokens which likely include abstract and introduction
            truncated_text = text[:10000] 
            
            prompt = ("Extract the 5-10 most important keywords or concepts from this document. "
                     "For each keyword, provide a relevance score from 0-10 and a brief explanation "
                     "of why it's important to the document's content. "
                     "Format your response as JSON with the structure: "
                     "[{\"keyword\": \"example\", \"score\": 8, \"explanation\": \"Brief reason\"}].\n\n" + truncated_text)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": "You are a keyword extraction assistant."},
                         {"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.3
            )
            
            result = response.choices[0].message.content.strip()
            
            # Extract JSON from the response - handling cases where the model adds extra text
            json_match = re.search(r'(\[\s*\{.*\}\s*\])', result, re.DOTALL)
            if json_match:
                result = json_match.group(1)
                
            keywords = json.loads(result)
            return keywords
            
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            return []
    
    def _extract_author_year_from_reference(self, reference):
        """
        Attempt to extract author and year from a reference string
        Returns a string in the format "Author, Year"
        """
        try:
            # Try common patterns for references with years
            year_match = re.search(r'\((\d{4}[a-z]?)\)', reference)
            if not year_match:
                year_match = re.search(r'\b(19|20)\d{2}[a-z]?\b', reference)
            
            if year_match:
                year = year_match.group(1) if '(' in year_match.group(0) else year_match.group(0)
                
                # Try to extract the author part - various patterns
                author = None
                
                # Pattern: Author, A. B. (Year) or Author, A. B., & Other, C. D. (Year)
                author_match = re.match(r'([^(]+?)(?:,|\s+&|and|\d{4})', reference)
                if author_match:
                    author = author_match.group(1).strip()
                    
                    # Handle multiple authors - simplify to first author or "et al."
                    if len(author) > 30 or ',' in author[15:]:
                        first_author = author.split(',')[0]
                        if len(first_author) > 25:  # Likely multiple combined names
                            author = "Author et al."
                        else:
                            author = f"{first_author} et al."
                    
                if author:
                    return f"{author}, {year}"
            
            # If no clear pattern match, try a more generic approach
            words = reference.split()
            if len(words) > 2:
                # Use the first word as author and first detected year
                first_word = words[0].strip().rstrip(',.:;')
                return f"{first_word} et al., {year}" if year_match else None
            
        except Exception as e:
            print(f"Error extracting author/year: {e}")
        
        return None

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
    parser.add_argument('--detailed', '-d', action='store_true',
                        help='Include background information in summary')
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
            parallel=not args.sequential,
            detailed=args.detailed
        )
        
        if not args.output:
            print("\nSummary:\n")
            print(summary)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()