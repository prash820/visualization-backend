// === AI Provider Configuration ===
// This file is the SINGLE SOURCE OF TRUTH for all AI model/provider settings.
// To change the AI model or switch providers, update this file ONLY.
// All backend code should import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from here.
//
// To change the model, update OPENAI_MODEL or ANTHROPIC_MODEL below.
// To switch providers, add new exports and update usage in controllers.

import dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables from .env file
dotenv.config();

// Primary provider: OpenAI GPT-4o
export const OPENAI_MODEL = 'gpt-4o';

// OpenAI is now the primary provider
export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'; // Kept for reference

const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_SECRET_KEY || process.env.ANTHROPIC_API_KEY;

if (typeof window === 'undefined') {
  console.log('[AI CONFIG] OpenAI API key is', openaiKey ? 'SET' : 'NOT SET');
  console.log('[AI CONFIG] Anthropic API key is', anthropicKey ? 'SET' : 'NOT SET');
  if (openaiKey) {
    console.log('[AI CONFIG] OpenAI key starts with:', openaiKey.substring(0, 8) + '...');
  }
  if (anthropicKey) {
    console.log('[AI CONFIG] Anthropic key starts with:', anthropicKey.substring(0, 8) + '...');
  }
  console.log('[AI CONFIG] Primary model (OpenAI):', OPENAI_MODEL);
  console.log('[AI CONFIG] Available model (Anthropic):', ANTHROPIC_MODEL);
}

export const openai = new OpenAI({
  apiKey: openaiKey,
});

export const anthropic = new Anthropic({
  apiKey: anthropicKey,
});

export function getOpenAIModel() {
  return OPENAI_MODEL;
}

export function getAnthropicModel() {
  return ANTHROPIC_MODEL;
}

export function getOpenAIClient() {
  return openai;
}

export function getAnthropicClient() {
  return anthropic;
} 