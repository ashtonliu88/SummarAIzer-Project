import os
import json
from openai import OpenAI
from typing import List, Dict, Optional, Any

class SummaryRefiner:
    """
    A class that handles the refinement of summaries based on user input.
    Leverages OpenAI's API to generate improved summaries.
    """
    
    def __init__(self, api_key=None):
        # Use provided API key or get from environment variable
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            print("Warning: No OpenAI API key provided. Chat refinement will not work.")
            self.client = None
    
    def refine_summary(self, 
                      original_summary: str, 
                      user_request: str,
                      chat_history: Optional[List[Dict[str, str]]] = None,
                      references: Optional[List[str]] = None,
                      keywords: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Refine a summary based on user requests.
        
        Args:
            original_summary: The original summary text
            user_request: User's request to modify the summary
            chat_history: Previous chat exchanges
            references: List of references from the paper
            keywords: List of keywords from the paper
            
        Returns:
            Dictionary with refined summary and chat history
        """
        if not self.client:
            return {
                "error": "OpenAI API key not configured",
                "refined_summary": original_summary,
                "chat_history": chat_history or []
            }
        
        try:
            # Initialize chat history if None
            if chat_history is None:
                chat_history = []
            
            # Add the user's new message to history
            chat_history.append({"role": "user", "content": user_request})
            
            # First, generate the new summary in a separate call
            summary_system_msg = """You are an expert academic summary refiner.
Your task is to modify the provided academic summary based on the user's request.
Only return the refined summary text - no explanations, no prefixes, just the updated summary.
The summary should be comprehensive, well-structured, and maintain academic integrity.
"""
            
            summary_messages = [
                {"role": "system", "content": summary_system_msg},
                {"role": "system", "content": f"Original summary to refine: {original_summary}"},
                {"role": "user", "content": f"Please modify this summary according to this request: {user_request}"}
            ]
            
            # Call OpenAI API to get the refined summary
            summary_response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                messages=summary_messages,
                temperature=0.5,
                max_tokens=2000
            )
            
            # Extract the refined summary
            refined_summary = summary_response.choices[0].message.content.strip()
            
            # Now, generate an explanation message for the chat
            explanation_system_msg = self._create_system_message(references, keywords)
            
            explanation_messages = [
                {"role": "system", "content": explanation_system_msg},
                {"role": "system", "content": f"Original summary: {original_summary}"},
                {"role": "system", "content": f"Refined summary has already been created. Do not include the full summary in your response."},
                {"role": "user", "content": user_request}
            ]
            
            # Add chat history (limited to last 6 exchanges to save tokens)
            for msg in chat_history[-6:]:
                if msg["role"] != "user" or msg["content"] != user_request:  # Avoid duplication
                    explanation_messages.append(msg)
            
            # Call OpenAI API to get the explanation
            chat_response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                messages=explanation_messages,
                temperature=0.7,
                max_tokens=500  # Shorter response for the explanation
            )
            
            # Extract the explanation
            explanation_text = chat_response.choices[0].message.content.strip()
            
            # Add assistant response to history
            chat_history.append({"role": "assistant", "content": explanation_text})
            
            return {
                "refined_summary": refined_summary,
                "chat_history": chat_history,
                "success": True
            }
        
        except Exception as e:
            print(f"Error refining summary: {e}")
            return {
                "error": str(e),
                "refined_summary": original_summary,
                "chat_history": chat_history,
                "success": False
            }
    
    def answer_question(self, 
                      summary: str, 
                      user_question: str,
                      chat_history: Optional[List[Dict[str, str]]] = None,
                      references: Optional[List[str]] = None,
                      keywords: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Answer a question about the summary without modifying it.
        
        Args:
            summary: The summary text
            user_question: User's question about the summary
            chat_history: Previous chat exchanges
            references: List of references from the paper
            keywords: List of keywords from the paper
            
        Returns:
            Dictionary with the answer and chat history
        """
        if not self.client:
            return {
                "error": "OpenAI API key not configured",
                "chat_history": chat_history or []
            }
        
        try:
            # Initialize chat history if None
            if chat_history is None:
                chat_history = []
            
            # Add the user's new message to history
            chat_history.append({"role": "user", "content": user_question})
            
            # Create system message for Q&A mode
            qa_system_msg = """You are an expert academic assistant who answers questions about research papers.
Your task is to answer questions based on the provided academic summary.
Use the summary as your primary knowledge source, but you can reference citations if available.
Give concise, accurate answers that directly address the user's question.
IMPORTANT: DO NOT include the full summary or large chunks of it in your responses.
DO NOT start your response with a summary or overview of the paper.
Focus ONLY on answering the specific question using information from the summary.
If the summary doesn't contain enough information to fully answer the question, acknowledge the limitations of your answer.
"""
            
            qa_messages = [
                {"role": "system", "content": qa_system_msg},
                {"role": "system", "content": f"Summary of the research paper: {summary}"}
            ]
            
            # Add references context if available
            if references and len(references) > 0:
                references_text = "\n".join(references)
                qa_messages.append({"role": "system", "content": f"References:\n{references_text}"})
                
            # Add keywords context if available
            if keywords and len(keywords) > 0:
                keywords_text = ", ".join(keywords[:10])  # Limit to first 10
                qa_messages.append({"role": "system", "content": f"Keywords: {keywords_text}"})
            
            # Add the user question
            qa_messages.append({"role": "user", "content": user_question})
            
            # Add chat history (limited to last 6 exchanges to save tokens)
            for msg in chat_history[-6:]:
                if msg["role"] != "user" or msg["content"] != user_question:  # Avoid duplication
                    qa_messages.append(msg)
            
            # Call OpenAI API to get the answer
            qa_response = self.client.chat.completions.create(
                model="gpt-4-turbo",
                messages=qa_messages,
                temperature=0.7,
                max_tokens=800
            )
            
            # Extract the answer
            answer_text = qa_response.choices[0].message.content.strip()
            
            # Add assistant response to history
            chat_history.append({"role": "assistant", "content": answer_text})
            
            return {
                "chat_history": chat_history,
                "success": True
            }
        
        except Exception as e:
            print(f"Error answering question: {e}")
            return {
                "error": str(e),
                "chat_history": chat_history,
                "success": False
            }
    
    def _create_system_message(self, references=None, keywords=None) -> str:
        """
        Create a detailed system message with context for the refinement.
        
        Args:
            references: List of references from the paper
            keywords: List of keywords from the paper
            
        Returns:
            System message string
        """
        system_message = """You are an expert academic assistant that specializes in refining and customizing research paper summaries.
Your goal is to explain how you've improved a summary based on the user's specific request.

DO NOT include the full summary in your response. The summary has already been updated separately.
Focus on explaining what changes were made and why they improve the summary.

Some examples of what you can explain:
- How you made the summary more concise or more detailed
- Which aspects you focused on based on the user's request
- How you simplified complex concepts
- How you reorganized the content for better flow
- What key points you added from references

Always maintain a helpful and professional tone.
Begin with "Summary updated:" followed by a brief explanation of the changes you made.
If the user asks for something that's not possible with the given information, explain why and suggest alternatives.
If the user asks for something non-academic or inappropriate, politely redirect the conversation.
"""

        # Add context about references and keywords if available
        if references and len(references) > 0:
            system_message += f"\n\nThe paper contains {len(references)} references that you can refer to if needed."
            
        if keywords and len(keywords) > 0:
            keyword_list = ", ".join(keywords[:10])  # Limit to first 10
            system_message += f"\n\nKey topics in this paper include: {keyword_list}"
        
        return system_message
