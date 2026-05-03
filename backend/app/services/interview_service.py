"""
Interview service — with MCQ, Coding, and unlimited questions support.
"""

import uuid
import random
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.answer import Answer
from app.models.interview import Interview, InterviewRole
from app.models.question import Question
from app.models.result import Result

# ── Question Bank ────────────────────────────────────────────
QUESTIONS: dict[str, list[dict]] = {
    "Frontend": [
        # Technical
        {"text": "Explain the difference between == and === in JavaScript.", "type": "technical"},
        {"text": "What is the virtual DOM and how does React use it?", "type": "technical"},
        {"text": "How do you optimise a slow React application?", "type": "technical"},
        {"text": "What is CSS specificity and how does it work?", "type": "technical"},
        {"text": "How do you handle state management in large React apps?", "type": "technical"},
        {"text": "What is the difference between let, const, and var?", "type": "technical"},
        {"text": "Explain event bubbling and event capturing in JavaScript.", "type": "technical"},
        {"text": "What are React hooks and why were they introduced?", "type": "technical"},
        # MCQ
        {"text": "Which CSS property is used to make a flex container?", "type": "mcq",
         "choices": ["display: flex", "position: flex", "float: flex", "layout: flex"], "answer": "display: flex"},
        {"text": "What does 'async/await' do in JavaScript?", "type": "mcq",
         "choices": ["Makes code run faster", "Handles asynchronous operations", "Creates new threads", "Compiles code"], "answer": "Handles asynchronous operations"},
        {"text": "Which hook is used for side effects in React?", "type": "mcq",
         "choices": ["useState", "useEffect", "useRef", "useCallback"], "answer": "useEffect"},
        {"text": "What is the output of: typeof null in JavaScript?", "type": "mcq",
         "choices": ["null", "undefined", "object", "string"], "answer": "object"},
        {"text": "Which method is used to add an element at the end of an array?", "type": "mcq",
         "choices": ["push()", "pop()", "shift()", "unshift()"], "answer": "push()"},
        # Coding
        {"text": "Write a function to reverse a string in JavaScript.\nExample: reverse('hello') → 'olleh'", "type": "coding"},
        {"text": "Write a function to find the largest number in an array.\nExample: findMax([1, 5, 3, 9, 2]) → 9", "type": "coding"},
        {"text": "Write a function to check if a string is a palindrome.\nExample: isPalindrome('racecar') → true", "type": "coding"},
        {"text": "Write CSS to center a div both horizontally and vertically using flexbox.", "type": "coding"},
        # Behavioral
        {"text": "Describe a challenging frontend bug you fixed.", "type": "behavioral"},
        {"text": "Tell me about a project you built from scratch.", "type": "behavioral"},
    ],
    "Backend": [
        # Technical
        {"text": "Explain REST vs GraphQL and when to use each.", "type": "technical"},
        {"text": "How do you prevent SQL injection in your APIs?", "type": "technical"},
        {"text": "What is database indexing and when should you use it?", "type": "technical"},
        {"text": "How do async/await work under the hood in Python?", "type": "technical"},
        {"text": "What is the difference between authentication and authorisation?", "type": "technical"},
        # MCQ
        {"text": "Which HTTP status code means 'Not Found'?", "type": "mcq",
         "choices": ["200", "301", "404", "500"], "answer": "404"},
        {"text": "What does ACID stand for in databases?", "type": "mcq",
         "choices": ["Atomicity, Consistency, Isolation, Durability", "Access, Control, Identity, Data", "Async, Cache, Index, Deploy", "None of these"], "answer": "Atomicity, Consistency, Isolation, Durability"},
        {"text": "Which of these is NOT a valid HTTP method?", "type": "mcq",
         "choices": ["GET", "POST", "FETCH", "DELETE"], "answer": "FETCH"},
        {"text": "What is the default port for PostgreSQL?", "type": "mcq",
         "choices": ["3306", "5432", "8080", "27017"], "answer": "5432"},
        # Coding
        {"text": "Write a Python function to find all duplicate values in a list.\nExample: find_duplicates([1,2,3,2,4,1]) → [1, 2]", "type": "coding"},
        {"text": "Write a SQL query to find the top 5 highest paid employees from an 'employees' table with columns: id, name, salary.", "type": "coding"},
        {"text": "Write a Python function to check if a number is prime.\nExample: is_prime(7) → True, is_prime(4) → False", "type": "coding"},
        # Behavioral
        {"text": "Tell me about a time you improved API performance.", "type": "behavioral"},
        {"text": "Describe a production issue you resolved under pressure.", "type": "behavioral"},
    ],
    "default": [
        {"text": "Tell me about yourself and your experience.", "type": "hr"},
        {"text": "What are your main technical strengths?", "type": "hr"},
        {"text": "Describe a difficult technical problem you solved.", "type": "behavioral"},
        {"text": "Where do you see yourself in 3 years?", "type": "hr"},
        {"text": "Tell me about a time you worked in a team under pressure.", "type": "behavioral"},
        {"text": "How do you approach debugging a production issue?", "type": "situational"},
        {"text": "How do you prioritise multiple tasks with tight deadlines?", "type": "situational"},
        {"text": "Describe a project you are most proud of.", "type": "behavioral"},
        # MCQ
        {"text": "Which data structure uses LIFO (Last In, First Out)?", "type": "mcq",
         "choices": ["Queue", "Stack", "Array", "Linked List"], "answer": "Stack"},
        {"text": "What does OOP stand for?", "type": "mcq",
         "choices": ["Object Oriented Programming", "Open Output Protocol", "Operational Oriented Process", "None"], "answer": "Object Oriented Programming"},
        {"text": "Which of these is a version control system?", "type": "mcq",
         "choices": ["Docker", "Git", "Nginx", "Redis"], "answer": "Git"},
        # Coding
        {"text": "Write a function to calculate the factorial of a number.\nExample: factorial(5) → 120", "type": "coding"},
        {"text": "Write a function to remove duplicate values from an array.\nExample: removeDups([1,2,2,3,3,4]) → [1,2,3,4]", "type": "coding"},
        # Extra questions for 100-question support
        {"text": "What is the difference between synchronous and asynchronous programming?", "type": "technical"},
        {"text": "Explain the concept of recursion with an example.", "type": "technical"},
        {"text": "What is Big O notation?", "type": "technical"},
        {"text": "Explain the difference between a stack and a queue.", "type": "technical"},
        {"text": "What is a REST API?", "type": "technical"},
        {"text": "What is the difference between SQL and NoSQL databases?", "type": "technical"},
        {"text": "What are design patterns? Name 2 examples.", "type": "technical"},
        {"text": "What is version control and why is it important?", "type": "technical"},
        {"text": "Explain the concept of inheritance in OOP.", "type": "technical"},
        {"text": "What is the difference between compiled and interpreted languages?", "type": "technical"},
        # MCQ extras
        {"text": "Which data structure uses FIFO order?", "type": "mcq",
         "choices": ["Stack", "Queue", "Tree", "Graph"], "answer": "Queue"},
        {"text": "What does API stand for?", "type": "mcq",
         "choices": ["Application Programming Interface", "Applied Process Integration", "Automated Program Installer", "None"], "answer": "Application Programming Interface"},
        {"text": "Which sorting algorithm has the best average time complexity?", "type": "mcq",
         "choices": ["Bubble Sort", "Merge Sort", "Quick Sort", "Selection Sort"], "answer": "Quick Sort"},
        {"text": "What does HTML stand for?", "type": "mcq",
         "choices": ["HyperText Markup Language", "High Tech Modern Language", "Hyper Transfer Method Language", "None"], "answer": "HyperText Markup Language"},
        {"text": "Which of these is a NoSQL database?", "type": "mcq",
         "choices": ["MySQL", "PostgreSQL", "MongoDB", "SQLite"], "answer": "MongoDB"},
        {"text": "What is the time complexity of binary search?", "type": "mcq",
         "choices": ["O(n)", "O(log n)", "O(n²)", "O(1)"], "answer": "O(log n)"},
        # Coding extras
        {"text": "Write a function to count occurrences of each character in a string.\nExample: count('hello') → {h:1, e:1, l:2, o:1}", "type": "coding"},
        {"text": "Write a function to check if two strings are anagrams.\nExample: isAnagram('listen', 'silent') → true", "type": "coding"},
        {"text": "Write a function to flatten a nested array.\nExample: flatten([1,[2,[3,4]]]) → [1,2,3,4]", "type": "coding"},
        {"text": "Write a function to find the second largest number in an array.\nExample: secondLargest([1,5,3,9,2]) → 5", "type": "coding"},
        {"text": "Write a function to check if a number is a power of 2.\nExample: isPowerOf2(8) → true, isPowerOf2(6) → false", "type": "coding"},
        # Behavioral extras
        {"text": "Tell me about a time you had to learn something new quickly.", "type": "behavioral"},
        {"text": "Describe a situation where you disagreed with a teammate and how you resolved it.", "type": "behavioral"},
        {"text": "What is your biggest technical weakness and how are you working on it?", "type": "behavioral"},
        {"text": "Tell me about a time you missed a deadline. What happened?", "type": "behavioral"},
        {"text": "How do you handle working under tight deadlines?", "type": "situational"},
        {"text": "What would you do if you found a critical bug in production?", "type": "situational"},
        {"text": "How do you prioritize when you have multiple urgent tasks?", "type": "situational"},
    ],
}


async def get_role_or_404(db, role_id):
    result = await db.execute(select(InterviewRole).where(InterviewRole.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Interview role not found")
    return role


async def start_interview(db, user_id, role_id, total_questions):
    role = await get_role_or_404(db, role_id)
    now = datetime.now(timezone.utc)
    # Cap total questions at 50 max
    # No cap - allow up to 100 questions
    total_questions = min(total_questions, 100)
    interview = Interview(
        user_id=user_id, role_id=role_id, status="in_progress",
        total_questions=total_questions, started_at=now,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    interview.role = role
    return interview


async def generate_question(db, interview_id, user_id, question_number):
    from fastapi import HTTPException
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail=f"Interview is already {interview.status}")
    if question_number > interview.total_questions:
        raise HTTPException(status_code=400, detail="Question number exceeds total")

    existing = await db.execute(
        select(Question).where(
            Question.interview_id == interview_id,
            Question.order_index == question_number,
        )
    )
    existing_q = existing.scalar_one_or_none()
    if existing_q:
        return existing_q

    role = await get_role_or_404(db, interview.role_id)
    pool = QUESTIONS.get(role.category, QUESTIONS["default"])
    
    # Get already asked question texts to avoid repetition
    asked = await db.execute(
        select(Question.question_text).where(Question.interview_id == interview_id)
    )
    asked_texts = set(r[0] for r in asked.all())
    
    # Filter unasked questions, cycle if needed
    unasked = [q for q in pool if q["text"] not in asked_texts]
    if not unasked:
        unasked = pool  # All asked, cycle through
    
    # Pick question - mix types: 40% technical, 30% mcq, 20% coding, 10% behavioral
    type_weights = {"technical": 4, "mcq": 3, "coding": 2, "behavioral": 1, "hr": 1, "situational": 1}
    
    def weight(q):
        return type_weights.get(q["type"], 1)
    
    weighted_pool = []
    for q in unasked:
        weighted_pool.extend([q] * weight(q))
    
    q_data = random.choice(weighted_pool)

    # Store choices in question_text as JSON prefix for MCQ
    q_text = q_data["text"]
    if q_data["type"] == "mcq" and "choices" in q_data:
        import json
        choices_str = json.dumps(q_data["choices"])
        q_text = f"__MCQ__{choices_str}__END__{q_data['text']}"

    question = Question(
        interview_id=interview_id, role_id=interview.role_id,
        question_text=q_text, question_type=q_data["type"],
        order_index=question_number, ai_model="placeholder",
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


async def submit_answer(db, interview_id, question_id, user_id, answer_text, time_taken_sec):
    from fastapi import HTTPException
    from app.services.ai_service import evaluate_answer_with_ai

    iv_result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = iv_result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    q_result = await db.execute(
        select(Question).where(Question.id == question_id, Question.interview_id == interview_id)
    )
    question = q_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    answer = Answer(
        interview_id=interview_id, question_id=question_id,
        user_id=user_id, answer_text=answer_text, time_taken_sec=time_taken_sec,
    )
    db.add(answer)
    await db.flush()

    answered_count_result = await db.execute(
        select(func.count()).where(Answer.interview_id == interview_id)
    )
    answered_count = answered_count_result.scalar() or 0
    is_complete = answered_count >= interview.total_questions

    role = await get_role_or_404(db, interview.role_id)
    
    # For MCQ, check if answer is correct for instant scoring
    q_text = question.question_text
    instant_score = None
    if question.question_type == "mcq" and q_text.startswith("__MCQ__"):
        import json
        end_idx = q_text.find("__END__")
        choices_str = q_text[7:end_idx]
        actual_question = q_text[end_idx+7:]
        # Find correct answer from question bank
        all_questions = []
        for pool in QUESTIONS.values():
            all_questions.extend(pool)
        for q in all_questions:
            if q.get("type") == "mcq" and q["text"] == actual_question:
                correct = q.get("answer", "")
                instant_score = 10.0 if answer_text.strip() == correct.strip() else 3.0
                break

    try:
        ai_result = await evaluate_answer_with_ai(
            question_text=q_text.split("__END__")[-1] if "__END__" in q_text else q_text,
            answer_text=answer_text,
            role_title=role.title,
            difficulty=role.difficulty,
        )
        if instant_score is not None:
            ai_result["score"] = instant_score
    except Exception as e:
        print(f"AI evaluation failed: {e}")
        ai_result = {
            "score": instant_score or 5.0, "relevance_score": 5.0, "clarity_score": 5.0,
            "depth_score": 5.0, "feedback": "Answer saved. AI evaluation pending.",
            "ideal_answer": None, "strengths": ["Attempted to answer"],
            "improvements": ["Could add more detail"],
            "hire_recommendation": "maybe", "overall_feedback": "Evaluation pending",
        }

    result_row = Result(
        interview_id=interview_id, answer_id=answer.id, user_id=user_id,
        score=ai_result.get("score"),
        relevance_score=ai_result.get("relevance_score"),
        clarity_score=ai_result.get("clarity_score"),
        depth_score=ai_result.get("depth_score"),
        feedback=ai_result.get("feedback", ""),
        ideal_answer=ai_result.get("ideal_answer"),
        strengths=ai_result.get("strengths", []),
        improvements=ai_result.get("improvements", []),
        hire_recommendation=ai_result.get("hire_recommendation"),
        overall_feedback=ai_result.get("overall_feedback"),
        overall_score=ai_result.get("score"),
        ai_model="openai/gpt-4o-mini",
    )
    db.add(result_row)

    if is_complete:
        interview.status = "completed"
        interview.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(answer)

    return {
        "answer_id": answer.id,
        "message": "Answer submitted successfully",
        "questions_answered": answered_count,
        "total_questions": interview.total_questions,
        "is_complete": is_complete,
    }


async def get_interview_results(db, interview_id, user_id):
    from fastapi import HTTPException

    iv_result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = iv_result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    role = await get_role_or_404(db, interview.role_id)

    r_result = await db.execute(
        select(Result, Answer, Question)
        .join(Answer, Result.answer_id == Answer.id)
        .join(Question, Answer.question_id == Question.id)
        .where(Result.interview_id == interview_id)
        .order_by(Question.order_index)
    )
    rows = r_result.all()

    results = []
    for result_row, answer_row, question_row in rows:
        # Clean MCQ prefix from question text
        q_text = question_row.question_text
        if "__END__" in q_text:
            q_text = q_text.split("__END__")[-1]
        result_row.question_text = q_text
        result_row.answer_text = answer_row.answer_text
        results.append(result_row)

    scored = [r.score for r in results if r.score is not None]
    overall = round(sum(scored) / len(scored), 2) if scored else None
    hire_rec = results[-1].hire_recommendation if results else None
    overall_feedback = results[-1].overall_feedback if results else None

    return {
        "interview_id": interview.id,
        "role": role.title,
        "status": interview.status,
        "total_questions": interview.total_questions,
        "started_at": interview.started_at,
        "completed_at": interview.completed_at,
        "overall_score": overall,
        "hire_recommendation": hire_rec,
        "overall_feedback": overall_feedback,
        "results": results,
    }
