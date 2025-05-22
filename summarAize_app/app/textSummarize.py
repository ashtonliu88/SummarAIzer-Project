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
                citation_instruction = f"""
                Include relevant citations in the format [Author, Year] throughout the summary when referencing specific findings or claims.
                
                Here are some of the references from the paper - use these for accurate citations:
                {'\n'.join(references_info)}
                
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
        Extract and parse references from the PDF text.
        
        Args:
            text: The extracted text content from the PDF
            
        Returns:
            List of references found in the text
        """
        try:
            # Get the entire document for processing
            full_text = text
            
            # Look for common reference section headers
            reference_headers = [
                r'(?i)references\s*$', 
                r'(?i)bibliography\s*$',
                r'(?i)works cited\s*$',
                r'(?i)literature cited\s*$',
                r'(?i)references cited\s*$',
                r'(?i)cited references\s*$',
                r'(?i)references\s+and\s+notes\s*$'
            ]
            
            # Try to find reference section in the full text
            references_text = None
            for header in reference_headers:
                header_match = re.search(header, full_text, re.MULTILINE)
                if header_match:
                    refs_start = header_match.end()
                    # Get text from match position to end of document
                    references_text = full_text[refs_start:].strip()
                    break
            
            # If no references found, try looking in just the last third of the document
            if not references_text:
                last_third = full_text[len(full_text)//3*2:]
                for header in reference_headers:
                    header_match = re.search(header, last_third, re.MULTILINE)
                    if header_match:
                        refs_start = header_match.end()
                        references_text = last_third[refs_start:].strip()
                        break
            
            # Combine pattern-based extraction with AI extraction for best results
            all_references = self.extract_references_with_patterns(references_text or full_text)
            
            # If we don't have enough references, try AI extraction
            if len(all_references) < 20:
                ai_references = self.extract_references_with_ai(full_text)
                
                # Combine and deduplicate references while preserving order
                seen = set()
                combined_references = []
                
                for ref in all_references + ai_references:
                    normalized_ref = self._normalize_reference(ref)
                    if normalized_ref and normalized_ref not in seen:
                        combined_references.append(ref)
                        seen.add(normalized_ref)
                
                all_references = combined_references
            
            # If we still don't have enough references, try comprehensive AI extraction
            if len(all_references) < 30:
                comprehensive_refs = self.extract_references_with_ai_comprehensive(full_text)
                
                # Add new references from comprehensive extraction
                seen = set(self._normalize_reference(ref) for ref in all_references if self._normalize_reference(ref))
                for ref in comprehensive_refs:
                    normalized_ref = self._normalize_reference(ref)
                    if normalized_ref and normalized_ref not in seen:
                        all_references.append(ref)
                        seen.add(normalized_ref)
            
            # Remove references that are too short or don't look like valid references
            cleaned_references = [ref for ref in all_references if len(ref.strip()) >= 20 and 
                                  (re.search(r'\d{4}', ref) or  # Has a year
                                   re.search(r'\b[A-Z][a-z]+\b', ref))]  # Has capitalized words
            
            # Return all references (no limit)
            return cleaned_references
            
        except Exception as e:
            print(f"Error extracting references: {e}")
            return []  # Return empty list on error
    
    def _normalize_reference(self, ref):
        """Normalize a reference for deduplication by removing punctuation and excess whitespace."""
        if not ref:
            return None
        # Keep only alphanumeric chars and convert to lowercase for comparison
        return re.sub(r'[^a-zA-Z0-9]', '', ref.lower())
    
    def _extract_author_year_from_reference(self, reference):
        """
        Extract author name and year from a reference string.
        Returns a formatted string like "Smith, 2018" or "Smith and Johnson, 2019"
        """
        if not reference or len(reference) < 10:
            return None
            
        try:
            # Common patterns for references
            # Pattern for APA style: Author, A. A., & Author, B. B. (Year)
            apa_match = re.search(r'([A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-z]+)?)\s*\((\d{4})\)', reference)
            if apa_match:
                author = apa_match.group(1).strip()
                year = apa_match.group(2)
                return f"{author}, {year}"
                
            # Pattern for numbered references [1] Author, A. (Year)
            numbered_match = re.search(r'\[\d+\]\s*([A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-z]+)?)[^(]*\((\d{4})\)', reference)
            if numbered_match:
                author = numbered_match.group(1).strip()
                year = numbered_match.group(2)
                return f"{author}, {year}"
                
            # Pattern for journal references: Author, A. (Year). Title. Journal
            journal_match = re.search(r'([A-Z][a-z]+(?:,?\s+[A-Za-z.,]+){0,2}(?:,?\s+(?:et\s+al\.?|and|&)[^(]*)?)\((\d{4})\)', reference)
            if journal_match:
                author = journal_match.group(1).strip()
                if ',' in author:
                    # Get just the last name(s)
                    author = author.split(',')[0].strip()
                year = journal_match.group(2)
                return f"{author}, {year}"
                
            # Extract any year in parentheses
            year_match = re.search(r'\((\d{4}[a-z]?)\)', reference)
            # Extract author names (capitalized words at the beginning)
            author_match = re.search(r'^(?:\[\d+\]\s*)?([A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-z]+)?)', reference)
            
            if year_match and author_match:
                author = author_match.group(1).strip()
                year = year_match.group(1)
                return f"{author}, {year}"
                
            # Last attempt - just get any capitalized words and any 4-digit number
            last_author_match = re.search(r'([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+){0,2})', reference)
            last_year_match = re.search(r'(\d{4})', reference)
            
            if last_author_match and last_year_match:
                author = last_author_match.group(1).strip()
                year = last_year_match.group(1)
                return f"{author}, {year}"
                
            return None
            
        except Exception as e:
            print(f"Error extracting author/year: {e}")
            return None
    
    def extract_references_with_patterns(self, text):
        """Extract references using regular expression patterns."""
        if not text:
            return []
            
        # Common reference patterns
        reference_patterns = [
            # Numbered references [1] Author, Title, Journal
            r'\[\d+\]\s*[A-Z].*?(?=\[\d+\]|\Z)',
            # Numbered references with dot: 1. Author, Title, Journal
            r'(?m)^\s*\d+\.\s*[A-Z].*?(?=^\s*\d+\.|$)',
            # Author-year references (Author et al., YYYY)
            r'(?<!\w)(?:[A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&))?,?\s+\(\d{4}\)|\([A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&))?,?\s+\d{4}\)).*?(?=(?<!\w)(?:[A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&))?,?\s+\(\d{4}\)|\([A-Z][a-z]+(?:,?\s+(?:et\s+al\.?|and|&))?,?\s+\d{4}\))|\Z)',
            # References with DOI
            r'(?m)^.*?doi:.*?$',
            # References with multiple authors separated by commas
            r'(?m)^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)+.*?\(\d{4}\).*?$',
            # Basic pattern for any line that could be a reference with year
            r'(?m)^[^.]*\.\s+[^.]*\.\s*\d{4}.*$'
        ]
        
        references = []
        
        # First try with the reference patterns
        for pattern in reference_patterns:
            try:
                matches = re.findall(pattern, text, re.DOTALL)
                if matches:
                    # Clean up matches
                    refs = [ref.strip() for ref in matches if len(ref.strip()) > 20]
                    references.extend(refs)
            except Exception as e:
                print(f"Error with pattern {pattern}: {e}")
                continue
        
        # If pattern matching didn't yield enough results, try splitting by common delimiters
        if len(references) < 20:
            # Try splitting by line numbers or brackets for numbered references
            numbered_refs = re.findall(r'(?m)^(?:\d+\.|\[\d+\]).*?$', text)
            if numbered_refs and len(numbered_refs) > 5:
                references.extend([ref.strip() for ref in numbered_refs if len(ref.strip()) > 20 and ref.strip() not in references])
        
        return references
    
    def extract_references_with_ai(self, text):
        """Use the OpenAI API to extract references."""
        try:
            # Get the last part of the document to save tokens
            text_parts = text.split('\n\n')
            last_part = '\n\n'.join(text_parts[-min(100, len(text_parts)):])
            
            prompt = f"""
            Please extract all bibliographic references from the following text. 
            The text is from a research paper. Return ONLY the references, 
            each on a new line, with no numbering or commentary.
            
            Focus on identifying complete reference entries that include author names, 
            publication year, title, and source. Many papers have 50-100 references.
            
            Text from paper:
            {last_part}
            """
            
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a research assistant that extracts bibliographic references from academic papers. Return only the references with no additional text."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    max_tokens=2000
                )
                
                references_text = response.choices[0].message.content
                references = [ref.strip() for ref in references_text.split('\n') if ref.strip()]
                return references
            
            except Exception as api_error:
                print(f"Error calling OpenAI API: {api_error}")
                return []
                
        except Exception as e:
            print(f"Error extracting references with AI: {e}")
            return []
    
    def extract_references_with_ai_comprehensive(self, text):
        """
        Use a more comprehensive approach with OpenAI API to extract references 
        when other methods don't capture all references.
        """
        try:
            # Process the document in chunks to ensure we capture all references
            # Split into thirds to handle large documents
            text_length = len(text)
            chunk_size = text_length // 3
            
            chunks = [
                text[text_length-chunk_size*3:text_length-chunk_size*2],  # Last third
                text[text_length-chunk_size*2:text_length-chunk_size],    # Middle third 
                text[text_length-chunk_size:]                            # Final third
            ]
            
            all_refs = []
            
            for i, chunk in enumerate(chunks):
                chunk_position = "end" if i == 2 else "middle" if i == 1 else "beginning"
                
                prompt = f"""
                Extract ALL bibliographic references from this {chunk_position} portion of a research paper.
                Return ONLY the complete references, each on a separate line.
                
                Many scientific papers have 50-100 references. Make sure to capture all references,
                regardless of their format (numbered, author-year, etc.).
                
                Text chunk:
                {chunk}
                """
                
                try:
                    response = self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": "You are a research assistant specializing in extracting bibliographic references from scientific papers. Return only the references with no additional text."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.1,
                        max_tokens=2000
                    )
                    
                    references_text = response.choices[0].message.content
                    chunk_refs = [ref.strip() for ref in references_text.split('\n') if ref.strip() and len(ref.strip()) > 20]
                    all_refs.extend(chunk_refs)
                    
                except Exception as api_error:
                    print(f"Error calling OpenAI API for chunk {i+1}: {api_error}")
                    continue
            
            # Deduplicate references
            seen = set()
            unique_refs = []
            
            for ref in all_refs:
                normalized = self._normalize_reference(ref)
                if normalized and normalized not in seen:
                    unique_refs.append(ref)
                    seen.add(normalized)
            
            return unique_refs
            
        except Exception as e:
            print(f"Error in comprehensive reference extraction: {e}")
            return []

    def extract_keywords(self, text, n=10):
        """
        Extract important keywords from the paper text.
        
        Args:
            text: The extracted text from the paper
            n: Maximum number of keywords to extract
            
        Returns:
            List of keywords/keyphrases with their importance scores
        """
        try:
            # Use the OpenAI API to extract keywords
            prompt = f"""
            Extract the {n} most important technical keywords or keyphrases from this research paper text.
            For each keyword or keyphrase, provide an importance score from 1-10 and a brief explanation of its significance within the paper.
            Format the response as a list of JSON objects with the following structure:
            
            [
                {{
                    "keyword": "Example Keyword",
                    "score": 8,
                    "explanation": "Brief explanation of why this is important (2-3 sentences max)"
                }},
                ...
            ]
            
            Text from paper (excerpt):
            {text[:10000]}  # Only use first part of text to save tokens
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a research assistant specialized in extracting and explaining technical keywords from academic papers. Your task is to identify the most important terms that would help someone understand the key concepts in the paper."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            try:
                result = response.choices[0].message.content
                keywords = json.loads(result)
                # Handle both formats: direct list or {"keywords": []}
                if isinstance(keywords, dict) and "keywords" in keywords:
                    return keywords["keywords"]
                else:
                    return keywords
            except json.JSONDecodeError as json_err:
                print(f"Error parsing JSON response: {json_err}")
                # Attempt to extract keywords with regex if JSON parsing fails
                import re
                keywords = []
                matches = re.findall(r'"keyword"\s*:\s*"([^"]+)"[^}]*"score"\s*:\s*(\d+)[^}]*"explanation"\s*:\s*"([^"]+)"', result)
                for match in matches:
                    keywords.append({
                        "keyword": match[0],
                        "score": int(match[1]),
                        "explanation": match[2]
                    })
                if keywords:
                    return keywords
                return []
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            return []

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