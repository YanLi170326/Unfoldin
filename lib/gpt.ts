import OpenAI from 'openai';
import { atom } from 'jotai';

// Initialize OpenAI client
let openai: OpenAI | null = null;

export const initOpenAI = (apiKey: string) => {
  openai = new OpenAI({
    apiKey,
  });
};

export const sessionHistoryAtom = atom<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);

export const addMessageAtom = atom(
  (get) => get(sessionHistoryAtom),
  (get, set, message: { role: 'user' | 'assistant'; content: string }) => {
    const history = get(sessionHistoryAtom);
    set(sessionHistoryAtom, [...history, message]);
  }
);

export const clearHistoryAtom = atom(
  null,
  (_, set) => {
    set(sessionHistoryAtom, []);
  }
);

// Predefined emotion release questions
const initialQuestion = "What emotion are you experiencing right now that you'd like to explore and release?";

const followUpQuestions = [
  "Where in your body do you feel this emotion? Take a moment to notice the physical sensations.",
  "What thoughts or memories are connected to this feeling? Allow yourself to observe them without judgment.",
  "If this emotion could speak, what would it say to you? What does it need you to know?"
];

export const emotionQuestionsAtom = atom({
  current: initialQuestion,
  index: 0,
  questions: [initialQuestion, ...followUpQuestions],
});

export const nextQuestionAtom = atom(
  (get) => get(emotionQuestionsAtom),
  (get, set) => {
    const state = get(emotionQuestionsAtom);
    const nextIndex = state.index + 1;
    
    if (nextIndex < state.questions.length) {
      set(emotionQuestionsAtom, {
        ...state,
        current: state.questions[nextIndex],
        index: nextIndex
      });
      return true;
    }
    return false; // No more questions
  }
);

export const resetQuestionsAtom = atom(
  null,
  (_, set) => {
    set(emotionQuestionsAtom, {
      current: initialQuestion,
      index: 0,
      questions: [initialQuestion, ...followUpQuestions],
    });
  }
);

export async function generatePersonalizedResponse(
  userInput: string, 
  history: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<string> {
  if (!openai) {
    console.error('OpenAI client not initialized');
    return "I'm sorry, I'm having trouble connecting to my AI service. Please try again later.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an empathetic emotional guidance assistant. 
          Your goal is to help the user identify, process, and release difficult emotions.
          Respond with warmth, validation, and gentle guidance.
          Keep responses concise (2-3 sentences maximum) and focused on emotional processing.
          Never diagnose or provide medical advice.`
        },
        ...history,
        { role: "user", content: userInput }
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm sorry, I'm having trouble connecting to my AI service. Please try again later.";
  }
} 