# SummarAIzer-Project

Project Title: SummarAIze

Team Members: Ashton Liu, Koena Gupta, Amisha Kandi, Nathan Yu, Poojitha Panda

## Final Submission Documents

1. [Release Summary](release_summary.pdf)
2. [Test Plan and Release](test_plan.pdf)
3. [Team Agreements](team_agreements.pdf)
4. [Design Document](design_doc.pdf)
5. [All Sprint Plans and Reports](https://drive.google.com/drive/folders/1TdFRTsUh2rvrl3xn3LCmZU0SCfbR5udJ?usp=sharing)

## Installation Instructions

1. Install Docker
2. Clone the repository
3. Make sure .env files are populated and created
4. Build and start all services using the command `docker-compose up --build -d`
5. Open your browser with the localhost link that is provided in your terminal

## User Guide

Initially when met with the URL, a user is presented with a landing page that draws their attention into the idea and encourages them to sign up or log in. Once logged in, a user is taken to the homepage where they can begin to upload a research paper. The user can click include citations to see them embedded in the summary and also choose the background level (beginner, intermediate, advanced) that they would like from the summary. After these selections have been made, the user should click go and wait till the summary, video of the extracted images, and generated audio pops up. The user can toggle the citations settings to be highlighted, normal, or removed. Following the summary, there is a list of key concepts extracted from the research paper and also a references list. The generated audio is after this so that people with more inclination to listen to text be spoken to them have that option available to them. Below that, the generated video of the images from the research paper stringed together is displayed for those who are visual learners. There is an implemented chat bot for the user to be able to ask Q&A based questions about the research paper and also ask to update or tweak the summary based on their specifications. Once a user has an account and has generated at least one summary, they can save and revisit their outputs in the My Library section.
