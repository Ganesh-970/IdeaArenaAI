import React, { useEffect, useState } from 'react'
import { AnimatedGradient } from '@/components/ui/animated-gradient'
import './App.css'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

type Segment = { name: string; share_percent: number; note?: string }
type Estimate = { label: string; amount: number; kind: 'revenue' | 'cost' }
type IndiaEvidence = {
  geography: string
  detected_industries: { industry: string; matched_keywords: string[] }[]
  datasets_matched: number
  direct_market_evidence_found: boolean
  contextual_datasets: {
    dataset: string
    matched_industry: string
    evidence_type: string
    record_count: number
    latest_period: string | null
    source: string
    limitations: string[]
  }[]
  not_found_topics: string[]
  warning: string
}

type AuthUser = { id: number; name: string; email: string; role: 'user' | 'admin'; created_at?: string }
type Report = {
  score: number
  market_potential: string
  market_demand: string
  confidence: string
  strengths: string[]
  weaknesses: string[]
  customer_segments: Segment[]
  financial_estimates: Estimate[]
  recommendations: string[]
  workflow: string[]
  verdict: string
  assumptions: string[]
  india_evidence?: IndiaEvidence
}

const features = [
  { icon: '	◉', title: '10 AI Perspectives', desc: 'Ten distinct personas examine your idea from customer, market, financial and technical viewpoints.' },
  { icon: '⚡', title: 'Live AI Debate', desc: 'Watch different perspectives challenge assumptions, debate risks and refine their opinions.' },
  { icon: '◈', title: 'Deep Analysis', desc: 'Get a structured report covering strengths, weaknesses, opportunities and potential failure points.' },
  { icon: '↗', title: 'What-if Simulator', desc: 'Change pricing, target audiences and business models to explore alternative possibilities.' },
]
const agents = [
  ['01', 'College Student', 'Customer perspective'], ['02', 'Working Professional', 'Customer perspective'],
  ['03', 'Budget Analyst', 'Price and value'], ['04', 'Premium Customer', 'Quality and experience'],
  ['05', 'Market Researcher', 'Market opportunities'], ['06', 'Marketing Strategist', 'Positioning and growth'],
  ['07', 'Financial Analyst', 'Revenue and costs'], ['08', 'Technology Expert', 'Technical feasibility'],
  ['09', 'Competitor Analyst', 'Competitive advantage'], ['10', 'Skeptical Investor', 'Investment potential'],
]
const stages = [
  'Understanding your business idea',
  'Identifying the customer problem',
  'Reviewing target customer groups',
  'Assessing market opportunities',
  'Checking competitors and positioning',
  'Evaluating financial feasibility',
  'Reviewing technical feasibility',
  'Comparing strengths and weaknesses',
  'Preparing practical recommendations',
  'Generating your final evaluation report',
]


// IDEAARENA_MULTILINGUAL_PATCH
type LanguageCode='en'|'hi'|'ta'|'te'
const UI_TRANSLATIONS:Record<string,Record<LanguageCode,string>>={"How it works": {"en": "How it works", "hi": "à¤¯à¤¹ à¤•à¥ˆà¤¸à¥‡ à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ", "ta": "à®‡à®¤à¯ à®Žà®ªà¯à®ªà®Ÿà®¿ à®šà¯†à®¯à®²à¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯", "te": "à°‡à°¦à°¿ à°Žà°²à°¾ à°ªà°¨à°¿à°šà±‡à°¸à±à°¤à±à°‚à°¦à°¿"}, "AI Personas": {"en": "AI Personas", "hi": "AI à¤µà¥à¤¯à¤•à¥à¤¤à¤¿à¤¤à¥à¤µ", "ta": "AI à®¨à®ªà®°à¯à®•à®³à¯", "te": "AI à°µà±à°¯à°•à±à°¤à°¿à°¤à±à°µà°¾à°²à±"}, "Features": {"en": "Features", "hi": "à¤µà¤¿à¤¶à¥‡à¤·à¤¤à¤¾à¤à¤", "ta": "à®…à®®à¯à®šà®™à¯à®•à®³à¯", "te": "à°²à°•à±à°·à°£à°¾à°²à±"}, "Log in": {"en": "Log in", "hi": "à¤²à¥‰à¤— à¤‡à¤¨", "ta": "à®‰à®³à¯à®¨à¯à®´à¯ˆà®¯", "te": "à°²à°¾à°—à°¿à°¨à±"}, "Try IdeaArena": {"en": "Try IdeaArena", "hi": "IdeaArena à¤†à¤œà¤¼à¤®à¤¾à¤à¤", "ta": "IdeaArena à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯", "te": "IdeaArena à°ªà±à°°à°¯à°¤à±à°¨à°¿à°‚à°šà°‚à°¡à°¿"}, "YOUR IDEA. TEN MINDS. ONE CLEAR DIRECTION.": {"en": "YOUR IDEA. TEN MINDS. ONE CLEAR DIRECTION.", "hi": "à¤†à¤ªà¤•à¤¾ à¤µà¤¿à¤šà¤¾à¤°à¥¤ à¤¦à¤¸ à¤¦à¥ƒà¤·à¥à¤Ÿà¤¿à¤•à¥‹à¤£à¥¤ à¤à¤• à¤¸à¥à¤ªà¤·à¥à¤Ÿ à¤¦à¤¿à¤¶à¤¾à¥¤", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆ. à®ªà®¤à¯à®¤à¯ à®ªà®¾à®°à¯à®µà¯ˆà®•à®³à¯. à®’à®°à¯ à®¤à¯†à®³à®¿à®µà®¾à®© à®¤à®¿à®šà¯ˆ.", "te": "à°®à±€ à°†à°²à±‹à°šà°¨. à°ªà°¦à°¿ à°¦à±ƒà°•à±à°•à±‹à°£à°¾à°²à±. à°’à°• à°¸à±à°ªà°·à±à°Ÿà°®à±ˆà°¨ à°¦à°¿à°¶."}, "Don't just imagine it.": {"en": "Don't just imagine it.", "hi": "à¤¸à¤¿à¤°à¥à¤« à¤•à¤²à¥à¤ªà¤¨à¤¾ à¤®à¤¤ à¤•à¥€à¤œà¤¿à¤à¥¤", "ta": "à®•à®±à¯à®ªà®©à¯ˆ à®šà¯†à®¯à¯à®µà®¤à¯‹à®Ÿà¯ à®¨à®¿à®±à¯à®¤à¯à®¤à®¾à®¤à¯€à®°à¯à®•à®³à¯.", "te": "à°Šà°¹à°¿à°‚à°šà°¡à°®à±‡ à°•à°¾à°¦à±."}, "Put your idea": {"en": "Put your idea", "hi": "à¤…à¤ªà¤¨à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¥‹", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆà®¯à¯ˆ", "te": "à°®à±€ à°†à°²à±‹à°šà°¨à°¨à±"}, " to the test.": {"en": " to the test.", "hi": "à¤ªà¤°à¤–à¤¿à¤à¥¤", "ta": "à®šà¯‹à®¤à®¿à®¤à¯à®¤à¯à®ªà¯ à®ªà®¾à®°à¯à®™à¯à®•à®³à¯.", "te": "à°ªà°°à±€à°•à±à°·à°¿à°‚à°šà°‚à°¡à°¿."}, "Test your idea": {"en": "Test your idea", "hi": "à¤…à¤ªà¤¨à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¥‹ à¤ªà¤°à¤–à¥‡à¤‚", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆà®¯à¯ˆà®šà¯ à®šà¯‹à®¤à®¿à®•à¯à®•à®µà¯à®®à¯", "te": "à°®à±€ à°†à°²à±‹à°šà°¨à°¨à± à°ªà°°à±€à°•à±à°·à°¿à°‚à°šà°‚à°¡à°¿"}, "Explore how it works": {"en": "Explore how it works", "hi": "à¤¯à¤¹ à¤•à¥ˆà¤¸à¥‡ à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ à¤¦à¥‡à¤–à¥‡à¤‚", "ta": "à®‡à®¤à¯ à®Žà®ªà¯à®ªà®Ÿà®¿ à®šà¯†à®¯à®²à¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯ à®Žà®©à¯à®ªà®¤à¯ˆà®ªà¯ à®ªà®¾à®°à¯à®™à¯à®•à®³à¯", "te": "à°‡à°¦à°¿ à°Žà°²à°¾ à°ªà°¨à°¿à°šà±‡à°¸à±à°¤à±à°‚à°¦à±‹ à°šà±‚à°¡à°‚à°¡à°¿"}, "10 unique AI perspectives": {"en": "10 unique AI perspectives", "hi": "10 à¤…à¤²à¤—-à¤…à¤²à¤— AI à¤¦à¥ƒà¤·à¥à¤Ÿà¤¿à¤•à¥‹à¤£", "ta": "10 à®¤à®©à®¿à®¤à¯à®¤à¯à®µà®®à®¾à®© AI à®ªà®¾à®°à¯à®µà¯ˆà®•à®³à¯", "te": "10 à°ªà±à°°à°¤à±à°¯à±‡à°• AI à°¦à±ƒà°•à±à°•à±‹à°£à°¾à°²à±"}, "One smarter way to think before you build.": {"en": "One smarter way to think before you build.", "hi": "à¤¬à¤¨à¤¾à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤¸à¥‹à¤šà¤¨à¥‡ à¤•à¤¾ à¤¬à¥‡à¤¹à¤¤à¤° à¤¤à¤°à¥€à¤•à¤¾à¥¤", "ta": "à®‰à®°à¯à®µà®¾à®•à¯à®•à¯à®µà®¤à®±à¯à®•à¯ à®®à¯à®©à¯ à®šà®¿à®¨à¯à®¤à®¿à®•à¯à®• à®šà®¿à®±à®¨à¯à®¤ à®µà®´à®¿.", "te": "à°¨à°¿à°°à±à°®à°¿à°‚à°šà±‡ à°®à±à°‚à°¦à± à°†à°²à±‹à°šà°¿à°‚à°šà°¡à°¾à°¨à°¿à°•à°¿ à°®à±†à°°à±à°—à±ˆà°¨ à°®à°¾à°°à±à°—à°‚."}, "ARENA SIMULATION": {"en": "ARENA SIMULATION", "hi": "à¤à¤°à¥€à¤¨à¤¾ à¤¸à¤¿à¤®à¥à¤²à¥‡à¤¶à¤¨", "ta": "à®…à®°à®™à¯à®•à¯à®šà¯ à®šà¯†à®¯à®²à¯à®®à¯à®±à¯ˆ", "te": "à°…à°°à±€à°¨à°¾ à°…à°¨à±à°•à°°à°£"}, "PREVIEW": {"en": "PREVIEW", "hi": "à¤ªà¥‚à¤°à¥à¤µà¤¾à¤µà¤²à¥‹à¤•à¤¨", "ta": "à®®à¯à®©à¯à®©à¯‹à®Ÿà¯à®Ÿà®®à¯", "te": "à°ªà±à°°à°¿à°µà±à°¯à±‚"}, "Evaluating your next big idea": {"en": "Evaluating your next big idea", "hi": "à¤†à¤ªà¤•à¥‡ à¤…à¤—à¤²à¥‡ à¤¬à¤¡à¤¼à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¤¾ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨", "ta": "à®‰à®™à¯à®•à®³à¯ à®…à®Ÿà¯à®¤à¯à®¤ à®ªà¯†à®°à®¿à®¯ à®¯à¯‹à®šà®©à¯ˆà®¯à¯ˆ à®®à®¤à®¿à®ªà¯à®ªà®¿à®Ÿà¯à®¤à®²à¯", "te": "à°®à±€ à°¤à°¦à±à°ªà°°à°¿ à°—à±Šà°ªà±à°ª à°†à°²à±‹à°šà°¨à°¨à± à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨à°‚ à°šà±‡à°¸à±à°¤à±‹à°‚à°¦à°¿"}, "An example of the IdeaArena experience": {"en": "An example of the IdeaArena experience", "hi": "IdeaArena à¤…à¤¨à¥à¤­à¤µ à¤•à¤¾ à¤‰à¤¦à¤¾à¤¹à¤°à¤£", "ta": "IdeaArena à®…à®©à¯à®ªà®µà®¤à¯à®¤à®¿à®©à¯ à®Žà®Ÿà¯à®¤à¯à®¤à¯à®•à¯à®•à®¾à®Ÿà¯à®Ÿà¯", "te": "IdeaArena à°…à°¨à±à°­à°µà°¾à°¨à°¿à°•à°¿ à°‰à°¦à°¾à°¹à°°à°£"}, "SUBMITTED IDEA": {"en": "SUBMITTED IDEA", "hi": "à¤œà¤®à¤¾ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤µà¤¿à¤šà¤¾à¤°", "ta": "à®šà®®à®°à¯à®ªà¯à®ªà®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿ à®¯à¯‹à®šà®©à¯ˆ", "te": "à°¸à°®à°°à±à°ªà°¿à°‚à°šà°¿à°¨ à°†à°²à±‹à°šà°¨"}, "Smart campus marketplace": {"en": "Smart campus marketplace", "hi": "à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤•à¥ˆà¤‚à¤ªà¤¸ à¤®à¤¾à¤°à¥à¤•à¥‡à¤Ÿà¤ªà¥à¤²à¥‡à¤¸", "ta": "à®¸à¯à®®à®¾à®°à¯à®Ÿà¯ à®µà®³à®¾à®• à®šà®¨à¯à®¤à¯ˆ", "te": "à°¸à±à°®à°¾à°°à±à°Ÿà± à°•à±à°¯à°¾à°‚à°ªà®¸à¯ à°®à°¾à°°à±à°•à±†à°Ÿà±	“à°ªà±à°²à±‡à°¸à±"}, "THE ARENA": {"en": "THE ARENA", "hi": "à¤à¤°à¥€à¤¨à¤¾", "ta": "à®…à®°à®™à¯à®•à®®à¯", "te": "à°…à°°à±€à°¨à°¾"}, "10 PERSONAS": {"en": "10 PERSONAS", "hi": "10 à¤µà¥à¤¯à¤•à¥à¤¤à¤¿à¤¤à¥à¤µ", "ta": "10 à®¨à®ªà®°à¯à®•à®³à¯", "te": "10 à°µà±à°¯à°•à±à°¤à°¿à°¤à±à°µà°¾à°²à±"}, "DEMO": {"en": "DEMO", "hi": "à¤¡à¥‡à¤®à¥‹", "ta": "à®Ÿà¯†à®®à¯‹", "te": "à°¡à±†à°®à±‹"}, "THINK BIGGER. BUILD SMARTER.": {"en": "THINK BIGGER. BUILD SMARTER.", "hi": "à¤¬à¤¡à¤¼à¤¾ à¤¸à¥‹à¤šà¥‡à¤‚à¥¤ à¤¸à¤®à¤à¤¦à¤¾à¤°à¥€ à¤¸à¥‡ à¤¬à¤¨à¤¾à¤à¤à¥¤", "ta": "à®ªà¯†à®°à®¿à®¤à®¾à®•à®šà¯ à®šà®¿à®¨à¯à®¤à®¿à®¯à¯à®™à¯à®•à®³à¯. à®ªà¯à®¤à¯à®¤à®¿à®šà®¾à®²à®¿à®¤à¯à®¤à®©à®®à®¾à®• à®‰à®°à¯à®µà®¾à®•à¯à®•à¯à®™à¯à®•à®³à¯.", "te": "à°ªà±†à°¦à±à°¦à°—à°¾ à°†à°²à±‹à°šà°¿à°‚à°šà°‚à°¡à°¿. à°¤à±†à°²à°¿à°µà°¿à°—à°¾ à°¨à°¿à°°à±à°®à°¿à°‚à°šà°‚à°¡à°¿."}, "THE IDEAARENA APPROACH": {"en": "THE IDEAARENA APPROACH", "hi": "IDEAARENA à¤•à¤¾ à¤¤à¤°à¥€à¤•à¤¾", "ta": "IDEAARENA à®…à®£à¯à®•à¯à®®à¯à®±à¯ˆ", "te": "IDEAARENA à°µà°¿à°§à°¾à°¨à°‚"}, "BUILT TO CHALLENGE IDEAS": {"en": "BUILT TO CHALLENGE IDEAS", "hi": "à¤µà¤¿à¤šà¤¾à¤°à¥‹à¤‚ à¤•à¥‹ à¤šà¥à¤¨à¥Œà¤¤à¥€ à¤¦à¥‡à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¨à¤¿à¤°à¥à¤®à¤¿à¤¤", "ta": "à®¯à¯‹à®šà®©à¯ˆà®•à®³à¯ˆà®šà¯ à®šà®µà®¾à®²à¯ à®šà¯†à®¯à¯à®¯ à®‰à®°à¯à®µà®¾à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯", "te": "à°†à°²à±‹à°šà°¨à°²à°¨à± à°¸à°µà°¾à°²à± à°šà±‡à°¯à°¡à°¾à°¨à°¿à°•à°¿ à°°à±‚à°ªà±Šà°‚à°¦à°¿à°‚à°šà°¬à°¡à°¿à°‚à°¦à°¿"}, "Think from every angle.": {"en": "Think from every angle.", "hi": "à¤¹à¤° à¤ªà¤¹à¤²à¥‚ à¤¸à¥‡ à¤¸à¥‹à¤šà¥‡à¤‚à¥¤", "ta": "à®’à®µà¯à®µà¯Šà®°à¯ à®•à¯‹à®£à®¤à¯à®¤à®¿à®²à¯à®®à¯ à®šà®¿à®¨à¯à®¤à®¿à®¯à¯à®™à¯à®•à®³à¯.", "te": "à°ªà±à°°à°¤à°¿ à°•à±‹à°£à°‚ à°¨à±à°‚à°šà°¿ à°†à°²à±‹à°šà°¿à°‚à°šà°‚à°¡à°¿."}, "One idea. Different minds. A more complete picture.": {"en": "One idea. Different minds. A more complete picture.", "hi": "à¤à¤• à¤µà¤¿à¤šà¤¾à¤°à¥¤ à¤…à¤²à¤—-à¤…à¤²à¤— à¤¦à¥ƒà¤·à¥à¤Ÿà¤¿à¤•à¥‹à¤£à¥¤ à¤…à¤§à¤¿à¤• à¤¸à¤‚à¤ªà¥‚à¤°à¥à¤£ à¤¤à¤¸à¥à¤µà¥€à¤°à¥¤", "ta": "à®’à®°à¯ à®¯à¯‹à®šà®©à¯ˆ. à®ªà®² à®ªà®¾à®°à¯à®µà¯ˆà®•à®³à¯. à®®à¯à®´à¯à®®à¯ˆà®¯à®¾à®© à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯.", "te": "à°’à°• à°†à°²à±‹à°šà°¨. à°µà°¿à°­à°¿à°¨à±à°¨ à°¦à±ƒà°•à±à°•à±‹à°£à°¾à°²à±. à°¸à°®à°—à±à°° à°µà°¿à°¶à±à°²à±‡à°·à°£."}, "MEET YOUR EVALUATION TEAM": {"en": "MEET YOUR EVALUATION TEAM", "hi": "à¤…à¤ªà¤¨à¥€ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤Ÿà¥€à¤® à¤¸à¥‡ à¤®à¤¿à¤²à¥‡à¤‚", "ta": "à®‰à®™à¯à®•à®³à¯ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯à®•à¯ à®•à¯à®´à¯à®µà¯ˆà®šà¯ à®šà®¨à¯à®¤à®¿à®•à¯à®•à®µà¯à®®à¯", "te": "à°®à±€ à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨ à°¬à±ƒà°‚à°¦à°¾à°¨à±à°¨à°¿ à°•à°²à°µà°‚à°¡à°¿"}, "YOUR NEXT BIG IDEA STARTS HERE": {"en": "YOUR NEXT BIG IDEA STARTS HERE", "hi": "à¤†à¤ªà¤•à¤¾ à¤…à¤—à¤²à¤¾ à¤¬à¤¡à¤¼à¤¾ à¤µà¤¿à¤šà¤¾à¤° à¤¯à¤¹à¤¾à¤ à¤¶à¥à¤°à¥‚ à¤¹à¥‹à¤¤à¤¾ à¤¹à¥ˆ", "ta": "à®‰à®™à¯à®•à®³à¯ à®…à®Ÿà¯à®¤à¯à®¤ à®ªà¯†à®°à®¿à®¯ à®¯à¯‹à®šà®©à¯ˆ à®‡à®™à¯à®•à¯‡ à®¤à¯Šà®Ÿà®™à¯à®•à¯à®•à®¿à®±à®¤à¯", "te": "à°®à±€ à°¤à°¦à±à°ªà°°à°¿ à°—à±Šà°ªà±à°ª à°†à°²à±‹à°šà°¨ à°‡à°•à±à°•à°¡ à°ªà±à°°à°¾à°°à°‚à°­à°®à°µà±à°¤à±à°‚à°¦à°¿"}, "Enter the arena": {"en": "Enter the arena", "hi": "à¤à¤°à¥€à¤¨à¤¾ à¤®à¥‡à¤‚ à¤ªà¥à¤°à¤µà¥‡à¤¶ à¤•à¤°à¥‡à¤‚", "ta": "à®…à®°à®™à¯à®•à®¿à®±à¯à®•à¯à®³à¯ à®šà¯†à®²à¯à®²à¯à®™à¯à®•à®³à¯", "te": "à°…à°°à±€à°¨à°¾à°²à±‹à°•à°¿ à°ªà±à°°à°µà±‡à°¶à°¿à°‚à°šà°‚à°¡à°¿"}, "START YOUR EVALUATION": {"en": "START YOUR EVALUATION", "hi": "à¤…à¤ªà¤¨à¤¾ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚", "ta": "à®‰à®™à¯à®•à®³à¯ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯ˆà®¤à¯ à®¤à¯Šà®Ÿà®™à¯à®•à¯à®™à¯à®•à®³à¯", "te": "à°®à±€ à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨à°¾à°¨à±à°¨à°¿ à°ªà±à°°à°¾à°°à°‚à°­à°¿à°‚à°šà°‚à°¡à°¿"}, "Submit your": {"en": "Submit your", "hi": "à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚", "ta": "à®šà®®à®°à¯à®ªà¯à®ªà®¿à®•à¯à®•à®µà¯à®®à¯", "te": "à°¸à°®à°°à±à°ªà°¿à°‚à°šà°‚à°¡à°¿"}, "big idea.": {"en": "big idea.", "hi": "à¤¬à¤¡à¤¼à¤¾ à¤µà¤¿à¤šà¤¾à¤°à¥¤", "ta": "à®ªà¯†à®°à®¿à®¯ à®¯à¯‹à®šà®©à¯ˆ.", "te": "à°ªà±†à°¦à±à°¦ à°†à°²à±‹à°šà°¨."}, "Describe your idea. Let the AI evaluate its potential.": {"en": "Describe your idea. Let the AI evaluate its potential.", "hi": "à¤…à¤ªà¤¨à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¤¾ à¤µà¤°à¥à¤£à¤¨ à¤•à¤°à¥‡à¤‚à¥¤ AI à¤•à¥‹ à¤‡à¤¸à¤•à¥€ à¤•à¥à¤·à¤®à¤¤à¤¾ à¤•à¤¾ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤•à¤°à¤¨à¥‡ à¤¦à¥‡à¤‚à¥¤", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆà®¯à¯ˆ à®µà®¿à®µà®°à®¿à®•à¯à®•à®µà¯à®®à¯. à®…à®¤à®©à¯ à®šà®¾à®¤à¯à®¤à®¿à®¯à®¤à¯à®¤à¯ˆ AI à®®à®¤à®¿à®ªà¯à®ªà®¿à®Ÿà®Ÿà¯à®Ÿà¯à®®à¯.", "te": "à°®à±€ à°†à°²à±‹à°šà°¨à°¨à± à°µà°¿à°µà°°à°¿à°‚à°šà°‚à°¡à°¿. à°¦à°¾à°¨à°¿ à°¸à°¾à°®à°°à±à°¥à±à°¯à°¾à°¨à±à°¨à°¿ AI à°…à°‚à°šà°¨à°¾ à°µà±‡à°¯à°¨à°¿à°µà±à°µà°‚à°¡à°¿."}, "Idea title": {"en": "Idea title", "hi": "à¤µà¤¿à¤šà¤¾à¤° à¤•à¤¾ à¤¶à¥€à¤°à¥à¤·à¤•", "ta": "à®¯à¯‹à®šà®©à¯ˆà®¤à¯ à®¤à®²à¯ˆà®ªà¯à®ªà¯", "te": "à°†à°²à±‹à°šà°¨ à°¶à±€à°°à±à°·à°¿à°•"}, "Describe your idea": {"en": "Describe your idea", "hi": "à¤…à¤ªà¤¨à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¤¾ à¤µà¤°à¥à¤£à¤¨ à¤•à¤°à¥‡à¤‚", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆà®¯à¯ˆ à®µà®¿à®µà®°à®¿à®•à¯à®•à®µà¯à®®à¯", "te": "à°®à±€ à°†à°²à±‹à°šà°¨à°¨à± à°µà°¿à°µà°°à°¿à°‚à°šà°‚à°¡à°¿"}, "Evaluation stages": {"en": "Evaluation stages", "hi": "à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤šà¤°à¤£", "ta": "à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯ à®¨à®¿à®²à¯ˆà®•à®³à¯", "te": "à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨ à°¦à°¶à°²à±"}, "Finalising response	”¦": {"en": "Finalising response	”¦", "hi": "à¤œà¤µà¤¾à¤¬ à¤…à¤‚à¤¤à¤¿à¤® à¤°à¥‚à¤ª à¤¦à¤¿à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ	”¦", "ta": "à®ªà®¤à®¿à®²à¯ à®‡à®±à¯à®¤à®¿ à®šà¯†à®¯à¯à®¯à®ªà¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯	”¦", "te": "à°¸à°®à°¾à°§à°¾à°¨à°‚ à°¸à°¿à°¦à±à°§à°®à°µà±à°¤à±‹à°‚à°¦à°¿	”¦"}, "Evaluation could not be completed": {"en": "Evaluation could not be completed", "hi": "à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾", "ta": "à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯ˆ à®®à¯à®Ÿà®¿à®•à¯à®• à®®à¯à®Ÿà®¿à®¯à®µà®¿à®²à¯à®²à¯ˆ", "te": "à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨à°‚ à°ªà±‚à°°à±à°¤à°¿à°•à°¾à°²à±‡à°¦à±"}, "YOUR IDEA EVALUATION": {"en": "YOUR IDEA EVALUATION", "hi": "à¤†à¤ªà¤•à¥‡ à¤µà¤¿à¤šà¤¾à¤° à¤•à¤¾ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨", "ta": "à®‰à®™à¯à®•à®³à¯ à®¯à¯‹à®šà®©à¯ˆ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯", "te": "à°®à±€ à°†à°²à±‹à°šà°¨ à°®à±‚à°²à±à°¯à°¾à°‚à°•à°¨à°‚"}, "MARKET POTENTIAL": {"en": "MARKET POTENTIAL", "hi": "à¤¬à¤¾à¤œà¤¼à¤¾à¤° à¤•à¥à¤·à¤®à¤¤à¤¾", "ta": "à®šà®¨à¯à®¤à¯ˆ à®µà®¾à®¯à¯à®ªà¯à®ªà¯", "te": "à°®à°¾à°°à±à°•à±†à°Ÿà± à°¸à°¾à°®à°°à±à°¥à±à°¯à°‚"}, "MARKET DEMAND": {"en": "MARKET DEMAND", "hi": "à¤¬à¤¾à¤œà¤¼à¤¾à¤° à¤®à¤¾à¤‚à¤—", "ta": "à®šà®¨à¯à®¤à¯ˆà®¤à¯ à®¤à¯‡à®µà¯ˆ", "te": "à°®à°¾à°°à±à°•à±†à°Ÿà± à°¡à°¿à°®à°¾à°‚à°¡à±"}, "AI CONFIDENCE": {"en": "AI CONFIDENCE", "hi": "AI à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤¸à¥à¤¤à¤°", "ta": "AI à®¨à®®à¯à®ªà®•à®¤à¯à®¤à®©à¯à®®à¯ˆ", "te": "AI à°µà°¿à°¶à±à°µà°¾à°¸ à°¸à±à°¥à°¾à°¯à°¿"}, "Customer segment mix": {"en": "Customer segment mix", "hi": "à¤—à¥à¤°à¤¾à¤¹à¤• à¤µà¤°à¥à¤— à¤®à¤¿à¤¶à¥à¤°à¤£", "ta": "à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯ à®ªà®¿à®°à®¿à®µà¯ à®•à®²à®µà¯ˆ", "te": "à°•à°¸à±à°Ÿà°®à°°à± à°µà°¿à°­à°¾à°—à°¾à°² à°®à°¿à°¶à±à°°à°®à°‚"}, "Financial scenario": {"en": "Financial scenario", "hi": "à¤µà¤¿à¤¤à¥à¤¤à¥€à¤¯ à¤ªà¤°à¤¿à¤¦à¥ƒà¤¶à¥à¤¯", "ta": "à®¨à®¿à®¤à®¿ à®¨à®¿à®²à¯ˆ", "te": "à°†à°°à±à°¥à°¿à°• à°ªà°°à°¿à°¸à±à°¥à°¿à°¤à°¿"}, "What works": {"en": "What works", "hi": "à¤®à¤œà¤¼à¤¬à¥‚à¤¤ à¤ªà¤•à¥à¤·", "ta": "à®šà®¿à®±à®ªà¯à®ªà®¾à®• à®šà¯†à®¯à®²à¯à®ªà®Ÿà¯à®µà®¤à¯", "te": "à°¬à°²à°®à±ˆà°¨ à°…à°‚à°¶à°¾à°²à±"}, "What needs attention": {"en": "What needs attention", "hi": "à¤§à¥à¤¯à¤¾à¤¨ à¤¦à¥‡à¤¨à¥‡ à¤¯à¥‹à¤—à¥à¤¯ à¤¬à¤¾à¤¤à¥‡à¤‚", "ta": "à®•à®µà®©à®®à¯ à®¤à¯‡à®µà¯ˆà®ªà¯à®ªà®Ÿà¯à®®à¯ à®…à®®à¯à®šà®™à¯à®•à®³à¯", "te": "à°¶à±à°°à°¦à±à°§ à°…à°µà°¸à°°à°®à±ˆà°¨ à°…à°‚à°¶à°¾à°²à±"}, "Business workflow": {"en": "Business workflow", "hi": "à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤•à¤¾à¤°à¥à¤¯à¤ªà¥à¤°à¤µà¤¾à¤¹", "ta": "à®µà®£à®¿à®• à®šà¯†à®¯à®²à¯à®®à¯à®±à¯ˆ", "te": "à°µà±à°¯à°¾à°ªà°¾à°° à°µà°°à±à°•à±	”Œà°«à±à°²à±‹"}, "Recommended next moves": {"en": "Recommended next moves", "hi": "à¤…à¤—à¤²à¥‡ à¤¸à¥à¤à¤¾à¤ à¤—à¤ à¤•à¤¦à¤®", "ta": "à®ªà®°à®¿à®¨à¯à®¤à¯à®°à¯ˆà®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®®à¯ à®…à®Ÿà¯à®¤à¯à®¤ à®ªà®Ÿà®¿à®•à®³à¯", "te": "à°¸à°¿à°«à°¾à°°à±à°¸à± à°šà±‡à°¸à°¿à°¨ à°¤à°¦à±à°ªà°°à°¿ à°šà°°à±à°¯à°²à±"}, "Final verdict": {"en": "Final verdict", "hi": "à¤…à¤‚à¤¤à¤¿à¤® à¤¨à¤¿à¤·à¥à¤•à¤°à¥à¤·", "ta": "à®‡à®±à¯à®¤à®¿ à®®à¯à®Ÿà®¿à®µà¯", "te": "à°¤à±à°¦à°¿ à°¤à±€à°°à±à°ªà±"}, "Assumptions to validate": {"en": "Assumptions to validate", "hi": "à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¤¨à¥‡ à¤¯à¥‹à¤—à¥à¤¯ à¤§à¤¾à¤°à¤£à¤¾à¤à¤", "ta": "à®šà®°à®¿à®ªà®¾à®°à¯à®•à¯à®• à®µà¯‡à®£à¯à®Ÿà®¿à®¯ à®•à®°à¯à®¤à¯à®•à¯‹à®³à¯à®•à®³à¯", "te": "à°§à±ƒà°µà±€à°•à°°à°¿à°‚à°šà°¾à°²à±à°¸à°¿à°¨ à°…à°‚à°šà°¨à°¾à°²à±"}, "Not assessed": {"en": "Not assessed", "hi": "à¤†à¤•à¤²à¤¨ à¤¨à¤¹à¥€à¤‚ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾", "ta": "à®®à®¤à®¿à®ªà¯à®ªà®¿à®Ÿà®ªà¯à®ªà®Ÿà®µà®¿à®²à¯à®²à¯ˆ", "te": "à°…à°‚à°šà°¨à°¾ à°µà±‡à°¯à°²à±‡à°¦à±"}, "Needs validation": {"en": "Needs validation", "hi": "à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨ à¤†à¤µà¤¶à¥à¤¯à¤•", "ta": "à®šà®°à®¿à®ªà®¾à®°à¯à®ªà¯à®ªà¯ à®¤à¯‡à®µà¯ˆ", "te": "à°§à±ƒà°µà±€à°•à°°à°£ à°…à°µà°¸à°°à°‚"}, "Not specified": {"en": "Not specified", "hi": "à¤¨à¤¿à¤°à¥à¤¦à¤¿à¤·à¥à¤Ÿ à¤¨à¤¹à¥€à¤‚", "ta": "à®•à¯à®±à®¿à®ªà¯à®ªà®¿à®Ÿà®ªà¯à®ªà®Ÿà®µà®¿à®²à¯à®²à¯ˆ", "te": "à°ªà±‡à°°à±à°•à±Šà°¨à°¬à°¡à°²à±‡à°¦à±"}, "Customer segment data was not provided.": {"en": "Customer segment data was not provided.", "hi": "à¤—à¥à¤°à¤¾à¤¹à¤• à¤µà¤°à¥à¤— à¤•à¤¾ à¤¡à¥‡à¤Ÿà¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤", "ta": "à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯ à®ªà®¿à®°à®¿à®µà¯ à®¤à®°à®µà¯ à®µà®´à®™à¯à®•à®ªà¯à®ªà®Ÿà®µà®¿à®²à¯à®²à¯ˆ.", "te": "à°•à°¸à±à°Ÿà°®à°°à± à°µà°¿à°­à°¾à°—à°¾à°² à°¡à±‡à°Ÿà°¾ à°…à°‚à°¦à°¿à°‚à°šà°¬à°¡à°²à±‡à°¦à±."}, "No financial estimates returned.": {"en": "No financial estimates returned.", "hi": "à¤µà¤¿à¤¤à¥à¤¤à¥€à¤¯ à¤…à¤¨à¥à¤®à¤¾à¤¨ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚à¥¤", "ta": "à®¨à®¿à®¤à®¿ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®•à®³à¯ à®•à®¿à®Ÿà¯ˆà®•à¯à®•à®µà®¿à®²à¯à®²à¯ˆ.", "te": "à°†à°°à±à°¥à°¿à°• à°…à°‚à°šà°¨à°¾à°²à± à°…à°‚à°¦à±à°¬à°¾à°Ÿà±à°²à±‹ à°²à±‡à°µà±."}, "Think critically. Build confidently.": {"en": "Think critically. Build confidently.", "hi": "à¤†à¤²à¥‹à¤šà¤¨à¤¾à¤¤à¥à¤®à¤• à¤¸à¥‹à¤šà¥‡à¤‚à¥¤ à¤†à¤¤à¥à¤®à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤¸à¥‡ à¤¬à¤¨à¤¾à¤à¤à¥¤", "ta": "à®µà®¿à®®à®°à¯à®šà®©à®®à®¾à®•à®šà¯ à®šà®¿à®¨à¯à®¤à®¿à®¯à¯à®™à¯à®•à®³à¯. à®¨à®®à¯à®ªà®¿à®•à¯à®•à¯ˆà®¯à¯à®Ÿà®©à¯ à®‰à®°à¯à®µà®¾à®•à¯à®•à¯à®™à¯à®•à®³à¯.", "te": "à°µà°¿à°®à°°à±à°¶à°¨à°¾à°¤à±à°®à°•à°‚à°—à°¾ à°†à°²à±‹à°šà°¿à°‚à°šà°‚à°¡à°¿. à°¨à°®à±à°®à°•à°‚à°—à°¾ à°¨à°¿à°°à±à°®à°¿à°‚à°šà°‚à°¡à°¿."}, "College Student": {"en": "College Student", "hi": "à¤•à¥‰à¤²à¥‡à¤œ à¤›à¤¾à¤¤à¥à¤°", "ta": "à®•à®²à¯à®²à¯‚à®°à®¿ à®®à®¾à®£à®µà®°à¯", "te": "à°•à°³à°¾à°¶à°¾à°² à°µà°¿à°¦à±à°¯à°¾à°°à±à°¥à°¿"}, "Working Professional": {"en": "Working Professional", "hi": "à¤•à¤¾à¤®à¤•à¤¾à¤œà¥€ à¤ªà¥‡à¤¶à¥‡à¤µà¤°", "ta": "à®ªà®£à®¿à®ªà¯à®°à®¿à®¯à¯à®®à¯ à®¨à®¿à®ªà¯à®£à®°à¯", "te": "à°‰à°¦à±à°¯à±‹à°— à°¨à°¿à°ªà±à°£à±à°¡à±"}, "Budget Analyst": {"en": "Budget Analyst", "hi": "à¤¬à¤œà¤Ÿ à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤•", "ta": "à®ªà®Ÿà¯à®œà¯†à®Ÿà¯ à®†à®¯à¯à®µà®¾à®³à®°à¯", "te": "à°¬à°¡à±à°œà±†à°Ÿà± à°µà°¿à°¶à±à°²à±‡à°·à°•à±à°¡à±"}, "Premium Customer": {"en": "Premium Customer", "hi": "à¤ªà¥à¤°à¥€à¤®à¤¿à¤¯à¤® à¤—à¥à¤°à¤¾à¤¹à¤•", "ta": "à®ªà®¿à®°à¯€à®®à®¿à®¯à®®à¯ à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯", "te": "à°ªà±à°°à±€à°®à°¿à°¯à°‚ à°•à°¸à±à°Ÿà°®à°°à±"}, "Market Researcher": {"en": "Market Researcher", "hi": "à¤¬à¤¾à¤œà¤¼à¤¾à¤° à¤¶à¥‹à¤§à¤•à¤°à¥à¤¤à¤¾", "ta": "à®šà®¨à¯à®¤à¯ˆ à®†à®¯à¯à®µà®¾à®³à®°à¯", "te": "à°®à°¾à°°à±à°•à±†à°Ÿà± à°ªà°°à°¿à°¶à±‹à°§à°•à±à°¡à±"}, "Marketing Strategist": {"en": "Marketing Strategist", "hi": "à¤®à¤¾à¤°à¥à¤•à¥‡à¤Ÿà¤¿à¤‚à¤— à¤°à¤£à¤¨à¥€à¤¤à¤¿à¤•à¤¾à¤°", "ta": "à®šà®¨à¯à®¤à¯ˆà®ªà¯à®ªà®Ÿà¯à®¤à¯à®¤à®²à¯ à®µà®¿à®¯à¯‚à®• à®¨à®¿à®ªà¯à®£à®°à¯", "te": "à°®à°¾à°°à±à°•à±†à°Ÿà°¿à°‚à°—à± à°µà±à°¯à±‚à°¹à°•à°°à±à°¤"}, "Financial Analyst": {"en": "Financial Analyst", "hi": "à¤µà¤¿à¤¤à¥à¤¤à¥€à¤¯ à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤•", "ta": "à®¨à®¿à®¤à®¿ à®†à®¯à¯à®µà®¾à®³à®°à¯", "te": "à°†à°°à±à°¥à°¿à°• à°µà°¿à°¶à±à°²à±‡à°·à°•à±à°¡à±"}, "Technology Expert": {"en": "Technology Expert", "hi": "à¤ªà¥à¤°à¥Œà¤¦à¥à¤¯à¥‹à¤—à¤¿à¤•à¥€ à¤µà¤¿à¤¶à¥‡à¤·à¤œà¥à¤ž", "ta": "à®¤à¯Šà®´à®¿à®²à¯à®¨à¯à®Ÿà¯à®ª à®¨à®¿à®ªà¯à®£à®°à¯", "te": "à°¸à°¾à°‚à°•à±‡à°¤à®¿à®• à°¨à°¿à°ªà±à°£à±à°¡à±"}, "Competitor Analyst": {"en": "Competitor Analyst", "hi": "à¤ªà¥à¤°à¤¤à¤¿à¤¸à¥à¤ªà¤°à¥à¤§à¥€ à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤•", "ta": "à®ªà¯‹à®Ÿà¯à®Ÿà®¿ à®†à®¯à¯à®µà®¾à®³à®°à¯", "te": "à°ªà±‹à°Ÿà±€ à°µà°¿à°¶à±à°²à±‡à°·à°•à±à°¡à±"}, "Skeptical Investor": {"en": "Skeptical Investor", "hi": "à¤¸à¤‚à¤¦à¥‡à¤¹à¤¶à¥€à¤² à¤¨à¤¿à¤µà¥‡à¤¶à¤•", "ta": "à®šà®¨à¯à®¤à¯‡à®•à®¿à®•à¯à®•à¯à®®à¯ à®®à¯à®¤à®²à¯€à®Ÿà¯à®Ÿà®¾à®³à®°à¯", "te": "à°¸à°‚à°¦à±‡à°¹à°¿à°‚à°šà±‡ à°ªà±†à°Ÿà±à°Ÿà±à°¬à°¡à°¿à°¦à°¾à°°à±"}};
const LANGUAGE_NAMES:Record<LanguageCode,string>={en:'English',hi:'Hindi',ta:'Tamil',te:'Telugu'};
function tr(s:string,l:LanguageCode){return UI_TRANSLATIONS[s]?.[l]??s}
function Localized({language,children}:{language:LanguageCode;children:React.ReactNode}){function walk(n:React.ReactNode):React.ReactNode{if(typeof n==='string')return tr(n,language);if(Array.isArray(n))return n.map((v,i)=><React.Fragment key={i}>{walk(v)}</React.Fragment>);if(React.isValidElement(n)){const p={...(n.props as Record<string,unknown>)};for(const k of ['placeholder','title','aria-label'])if(typeof p[k]==='string')p[k]=tr(p[k] as string,language);if('children'in p)p.children=walk(p.children as React.ReactNode);return React.cloneElement(n,p)}return n}return <>{walk(children)}</>}

function App() {
  const [language,setLanguage]=useState<LanguageCode>(()=>(localStorage.getItem('ideaarena-language') as LanguageCode)||'en')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'register'|'admin'|null>(null)
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser|null>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [selectedHistory, setSelectedHistory] = useState<any>(null)
  const [dashboardBusy, setDashboardBusy] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [appInstalled, setAppInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => { setAppInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice?.outcome === 'accepted') setInstallPrompt(null)
      return
    }
    alert('To install IdeaArena: on Android, open your browser menu (â‹®) and choose 	”œInstall app	” or 	”œAdd to Home screen	”. On iPhone, tap Share and choose 	”œAdd to Home Screen	”.')
  }
  const token = () => localStorage.getItem('ideaarena-token') || ''

  useEffect(() => {
    const saved = localStorage.getItem('ideaarena-token')
    if (!saved) return
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setAuthUser(d.user))
      .catch(() => { localStorage.removeItem('ideaarena-token'); localStorage.removeItem('ideaarena-user') })
  }, [])

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setAuthBusy(true); setAuthError('')
    const path = authMode === 'register' ? '/api/auth/register' : authMode === 'admin' ? '/api/auth/admin/login' : '/api/auth/login'
    const payload = authMode === 'register' ? { name: authName, email: authEmail, password: authPassword } : { email: authEmail, password: authPassword }
    try {
      const r = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const d = await r.json(); if (!r.ok || !d.success) throw new Error(d.detail || 'Authentication failed.')
      localStorage.setItem('ideaarena-token', d.token); localStorage.setItem('ideaarena-user', JSON.stringify(d.user))
      setAuthUser(d.user); setAuthMode(null); setAuthPassword(''); setDashboard(null); setSelectedHistory(null)
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'Could not sign in.') }
    finally { setAuthBusy(false) }
  }

  async function loadDashboard(accessToken = token(), role = authUser?.role) {
    setDashboardBusy(true); setDashboardError('')
    try {
      const endpoint = role === 'admin' ? '/api/admin/overview' : '/api/auth/history'
      const r = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const d = await r.json(); if (!r.ok || !d.success) throw new Error(d.detail || 'Could not load dashboard.')
      setDashboard(d)
    } catch (err) { setDashboardError(err instanceof Error ? err.message : 'Could not load dashboard.') }
    finally { setDashboardBusy(false) }
  }

  function logout() { localStorage.removeItem('ideaarena-token'); localStorage.removeItem('ideaarena-user'); setAuthUser(null); setDashboard(null); setSelectedHistory(null); setAuthMode(null) }

  async function submitIdea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!authUser) { setAuthMode('login'); setAuthError('Please log in before submitting an idea.'); return }
    setLoading(true); setProgress(1); setReport(null); setError('')
    // This is an elapsed-time progress guide, not a claim of model-token completion.
    // It advances through the ten visible stages and waits at 9/10 until the API returns.
    const stageTimer = window.setInterval(() => {
      setProgress(current => Math.min(9, current + 1))
    }, 3500)
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title, description, language: LANGUAGE_NAMES[language] }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || data.detail || 'Evaluation failed')
      setProgress(10); setReport(data.evaluation as Report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Check that the backend and Ollama are running.')
    } finally {
      window.clearInterval(stageTimer); setLoading(false)
    }
  }
  const openForm = () => {
    if (!authUser) { setAuthError('Please log in or create an account before submitting an idea.'); setAuthMode('login'); return }
    setShowForm(true); setTimeout(() => document.getElementById('idea-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <Localized language={language}><><div className="site-gradient-background" aria-hidden="true"><AnimatedGradient config={{ preset: "Aurora" }} /></div><main className="site-content">
      <nav className="navbar">
        <a className="brand" href="#"><span className="brand-icon">I</span> idea<span>arena</span><small>AI</small></a>
        <div className="nav-links"><a href="#how">How it works</a><a href="#agents">AI Personas</a><a href="#features">Features</a></div>
        
<div className="nav-actions">
  <label className="language-control" aria-label="Choose language">
    <span>文</span>
    <select
      value={language}
      onChange={e => {
        const v = e.target.value as LanguageCode;
        setLanguage(v);
        localStorage.setItem("ideaarena-language", v);
      }}
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="ta">தமிழ்</option>
      <option value="te">తెలుగు</option>
    </select>
  </label>

  {authUser ? (
    <>
      <button className="login" onClick={() => loadDashboard()}>
        {authUser.role === 'admin' ? 'Admin Dashboard' : 'My History'}
      </button>
      <button className="header-logout" onClick={logout}>Log out</button>
    </>
  ) : (
    <button className="login" onClick={() => {
      setAuthError('');
      setAuthMode('login');
    }}>
      Log in
    </button>
  )}

  {!appInstalled && (
    <button className="install-app-btn" onClick={installApp}>
      <span aria-hidden="true">↓</span> Install App
    </button>
  )}

  <button className="nav-cta" onClick={openForm}>
    Try IdeaArena <span>↗</span>
  </button>
</div>

      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> YOUR IDEA. TEN MINDS. ONE CLEAR DIRECTION.</div>
          <h1>Don't just imagine it.<br /> <span>Put your idea</span> to the test.</h1>
          <p className="hero-description">Meet your AI-powered idea evaluation arena. Ten independent AI personas challenge your assumptions, debate possibilities and help you discover whether your next big idea is worth building.</p>
          <div className="hero-buttons"><button onClick={openForm} className="primary-btn">Test your idea <span>↗</span></button><a href="#how" className="secondary-btn"><span className="play">â–¶</span> Explore how it works</a></div>
          <div className="hero-proof"><div className="avatar-stack"><i>C</i><i>M</i><i>F</i><i>+</i></div><p><strong>10 unique AI perspectives</strong><br />One smarter way to think before you build.</p></div>
        </div>
        <div className="arena-preview">
          <div className="preview-top"><div><span className="live-dot"/> ARENA SIMULATION</div><span className="preview-tag">PREVIEW</span></div>
          <div className="preview-title">Evaluating your next big idea<span>...</span></div>
          <div className="preview-subtitle">An example of the IdeaArena experience</div>
          <div className="idea-box"><span>SUBMITTED IDEA</span><h3>Smart campus marketplace</h3><p>A platform connecting students to buy, sell and exchange campus essentials.</p></div>
          <div className="preview-agents"><div className="preview-agents-heading">THE ARENA <span>10 PERSONAS</span></div><div className="mini-grid">{agents.slice(0, 6).map((a, i) => <div className="mini-agent" key={a[0]}><b>{a[0]}</b><span>{a[1]}</span><i className={i % 2 ? 'orange' : ''}>â—</i></div>)}</div></div>
          <div className="preview-bottom"><span>âœ¦ Multiple perspectives. Better decisions.</span><span className="fake-status">DEMO</span></div>
        </div>
        
        <div className="hero-bottom"><span>THINK BIGGER. BUILD SMARTER.</span><span>IDEAS DESERVE A REAL TEST <b>â†“</b></span></div>
      </section>
      <section className="intro-section" id="how"><div className="section-kicker">THE IDEAARENA APPROACH</div><h2>Your idea deserves more than<br />a simple <span>"sounds good."</span></h2><p>Friends might encourage you. But before investing your time, money and energy, you need honest perspectives that question, challenge and examine your idea.</p></section>
      <section className="features-section" id="features"><div className="section-heading"><div><div className="section-kicker">BUILT TO CHALLENGE IDEAS</div><h2>Think from every angle.</h2></div><p>One idea. Different minds. A more complete picture.</p></div><div className="feature-grid">{features.map((f, i) => <article className="feature-card" key={f.title}><div className="feature-icon">{f.icon}</div><span className="feature-number">0{i + 1}</span><h3>{f.title}</h3><p>{f.desc}</p><span className="card-arrow">↗</span></article>)}</div></section>
      <section className="agents-section" id="agents"><div className="section-kicker">MEET YOUR EVALUATION TEAM</div><div className="section-heading"><h2>10 personas. <span>10 perspectives.</span></h2><p>Every persona has a distinct role and evaluation criteria. No single point of view gets the final word.</p></div><div className="agents-grid">{agents.map(a => <article className="agent-card" key={a[0]}><div className="agent-number">{a[0]}</div><div><h3>{a[1]}</h3><p>{a[2]}</p></div><span className="agent-arrow">↗</span></article>)}</div></section>
      <section className="final-cta" id="start"><div className="cta-glow"/><div className="section-kicker">YOUR NEXT BIG IDEA STARTS HERE</div><h2>Ready to challenge<br />your <span>next big idea?</span></h2><p>Don't wait until launch day to discover what you missed.</p><button className="primary-btn" onClick={openForm}>Enter the arena <span>↗</span></button><small>IDEAS ARE EASY. VALIDATION IS EVERYTHING.</small></section>

      {authMode && <div className="ia-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthMode(null)}}><section className="ia-auth-card" role="dialog" aria-modal="true" aria-label="Account access"><button className="ia-modal-close" onClick={()=>setAuthMode(null)} aria-label="Close">Ã—</button><div className="section-kicker">IDEAARENA ACCOUNT</div><h2>{authMode==='register'?'Create your account':authMode==='admin'?'Administrator access':'Welcome back'}</h2><p>{authMode==='register'?'Create an account to submit ideas and keep your evaluation history.':'Sign in to continue to your IdeaArena workspace.'}</p><div className="ia-auth-tabs"><button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthError('')}}>User login</button><button className={authMode==='register'?'active':''} onClick={()=>{setAuthMode('register');setAuthError('')}}>Create account</button><button className={authMode==='admin'?'active':''} onClick={()=>{setAuthMode('admin');setAuthError('')}}>Admin</button></div><form className="ia-auth-form" onSubmit={handleAuth}>{authMode==='register'&&<label>Full name<input required value={authName} onChange={e=>setAuthName(e.target.value)} autoComplete="name" /></label>}<label>Email address<input required type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email" /></label><label>Password<input required type="password" minLength={authMode==='register'?8:1} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} autoComplete={authMode==='register'?'new-password':'current-password'} /></label>{authError&&<div className="ia-auth-error">{authError}</div>}<button className="primary-btn submit-btn" disabled={authBusy}>{authBusy?'Please wait	”¦':authMode==='register'?'Create account':'Sign in'} ↗</button></form><small>Admin accounts are configured separately and cannot be created through public registration.</small></section></div>}
      {authUser && dashboard !== null && <div className="ia-dashboard-wrap"><section className="ia-dashboard"><div className="ia-dashboard-top"><div><div className="section-kicker">{authUser.role==='admin'?'ADMINISTRATION':'YOUR WORKSPACE'}</div><h2>Hello, <span>{authUser.name}</span></h2><p>{authUser.email}</p></div><div className="ia-dashboard-actions"><button className="secondary-btn" onClick={()=>loadDashboard()}>Refresh</button><button className="secondary-btn" onClick={()=>setDashboard(null)}>Close</button><button className="secondary-btn" onClick={logout}>Log out</button></div></div>{dashboardBusy?<p>Loading dashboard	”¦</p>:dashboardError?<div className="ia-auth-error">{dashboardError}</div>:authUser.role==='admin'?<><div className="ia-stat-grid"><article><small>REGISTERED USERS</small><strong>{dashboard?.stats?.users ?? 0}</strong></article><article><small>USER EVALUATIONS</small><strong>{dashboard?.stats?.user_evaluations ?? 0}</strong></article></div><h3>Registered users</h3><div className="ia-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Evaluations</th></tr></thead><tbody>{(dashboard?.users||[]).map((u:any)=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.created_at}</td><td>{u.evaluation_count}</td></tr>)}</tbody></table>{!dashboard?.users?.length&&<p>No registered users yet.</p>}</div><h3>Evaluation activity</h3><div className="ia-table-wrap"><table><thead><tr><th>Idea</th><th>User</th><th>Email</th><th>Date</th></tr></thead><tbody>{(dashboard?.evaluations||[]).map((v:any)=><tr key={v.id}><td>{v.title}</td><td>{v.user_name}</td><td>{v.user_email}</td><td>{v.created_at}</td></tr>)}</tbody></table>{!dashboard?.evaluations?.length&&<p>No user evaluations yet.</p>}</div></>:<>{selectedHistory ? <div className="ia-history-detail"><div className="ia-history-detail-top"><div><div className="section-kicker">SAVED EVALUATION REPORT</div><h3>{selectedHistory.title}</h3><small>Submitted: {selectedHistory.created_at}</small></div><button className="secondary-btn" onClick={()=>setSelectedHistory(null)}>â† Back to history</button></div><ReportView report={selectedHistory.evaluation as Report} title={selectedHistory.title} language={language} /></div> : <><h3>Your idea history</h3><p className="ia-history-hint">Select any idea below to open its complete evaluation report.</p><div className="ia-history-list">{(dashboard?.history||[]).map((v:any)=><button type="button" className="ia-history-item" key={v.id} onClick={()=>setSelectedHistory(v)}><div><strong>{v.title}</strong><small>{v.created_at}</small></div><div className="ia-history-score"><b>{Number(v.evaluation?.score ?? 0).toFixed(1)} / 10</b><span>View full report ↗</span></div></button>)}</div>{!dashboard?.history?.length&&<p>You haven't submitted an idea yet. Start an evaluation to see it here.</p>}<button className="primary-btn" onClick={()=>{setDashboard(null);openForm()}}>Submit an idea ↗</button></>}</>}</section></div>}
      {showForm && authUser && <section id="idea-form" className="idea-form-section">
        <div className="section-kicker">START YOUR EVALUATION</div><h2>Submit your <span>big idea.</span></h2><p>Describe your idea. Let the AI evaluate its potential.</p>
        <form onSubmit={submitIdea} className="idea-form">
          <label>Idea title<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Smart Campus Food Delivery" /></label>
          <label>Describe your idea<textarea required minLength={20} rows={6} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain the problem, your solution and who will use it..." /></label>
          <button className="primary-btn submit-btn" type="submit" disabled={loading}>{loading ? `AI agents debating Â· ${progress}/10` : 'Evaluate my idea â†—'}</button>
        </form>

        {loading && <div className="loading-panel">
          <div className="loader-orbit"><span/><span/><span/></div>
          <div className="loading-kicker">IDEA ARENA Â· LIVE EVALUATION</div>
          <h3>AI perspectives are analysing your idea</h3>
          <p>{stages[Math.min(progress - 1, 9)]}. The local model may take a little while.</p>
          <div className="progress-heading"><strong>{progress} <span>/ 10</span></strong><small>{progress === 9 ? 'Finalising response	”¦' : 'Evaluation stages'}</small></div>
          <div className="progress-ten" aria-label={`Evaluation progress stage ${progress} of 10`}>
            {stages.map((s, i) => <span key={s} className={i < progress ? 'complete' : ''} title={s}>{i + 1}</span>)}
          </div>
          <div className="loading-track"><span style={{ width: `${progress * 10}%` }}/></div>
          <div className="loading-steps">{stages.map((s, i) => <span className={i < progress ? 'active' : ''} key={s}>{s}</span>)}</div>
          <small className="progress-disclaimer">Progress shows the evaluation flow; it is not a live count of model tokens or ten independently running AI processes.</small>
        </div>}
        {error && <div className="error-panel"><b>Evaluation could not be completed</b><p>{error}</p></div>}
        {report && <ReportView report={report} title={title} language={language} />}
      </section>}
      <footer><a className="brand" href="#"><span className="brand-icon">I</span> idea<span>arena</span><small>AI</small></a><p>Think critically. Build confidently.</p><span>Â© 2026 IdeaArena AI</span></footer>
    </main><WebsiteChatbot /></></Localized>
  )
}


type ChatMessage = { role: 'bot' | 'user'; text: string }

const WEBSITE_CONTACT_EMAIL = 'vsgchowdary970@gmail.com'

const websiteAnswers: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['what is ideaarena', 'about ideaarena', 'what does ideaarena do', 'purpose', 'why ideaarena'],
    answer: 'IdeaArena AI helps people examine a business or product idea before investing time and money in building it. It brings together ten AI perspectives and produces a structured evaluation report.'
  },
  {
    keywords: ['how does it work', 'evaluation process', 'how it works', 'process', 'stages', 'steps'],
    answer: 'You submit an idea title and description. The evaluation reviews the customer problem, target groups, market opportunities, competitors, financial and technical feasibility, strengths and weaknesses, then prepares recommendations and a final report.'
  },
  {
    keywords: ['persona', 'personas', 'who are the agents', '10 ai', 'evaluation team', 'who evaluates'],
    answer: 'IdeaArena uses ten perspectives: College Student, Working Professional, Budget Analyst, Premium Customer, Market Researcher, Marketing Strategist, Financial Analyst, Technology Expert, Competitor Analyst and Skeptical Investor. Each considers the idea from a different viewpoint.'
  },
  {
    keywords: ['feature', 'features', 'what can it do', 'capabilities'],
    answer: 'The website describes four key features: 10 AI Perspectives, Live AI Debate, Deep Analysis, and a What-if Simulator for exploring changes to pricing, audiences and business models.'
  },
  {
    keywords: ['submit', 'start evaluation', 'test my idea', 'evaluate my idea', 'how to use', 'where do i start'],
    answer: 'Choose 	”œTest your idea	” or 	”œTry IdeaArena	”, then enter an idea title and a description of at least 20 characters in the evaluation form. Submit the form to request an evaluation.'
  },
  {
    keywords: ['report', 'results', 'what do i get', 'evaluation output', 'score', 'verdict'],
    answer: 'The evaluation report can include a score, market potential, market demand, AI confidence, strengths, weaknesses, customer segments, illustrative financial estimates, workflow, recommendations, assumptions and a final verdict.'
  },
  {
    keywords: ['india', 'rbi', 'dataset', 'evidence', 'market data'],
    answer: 'The report may show relevant Indian economic datasets matched to the idea. These datasets provide economic context; they do not independently prove customer demand, willingness to pay or market size, and they do not change the AI score.'
  },
  {
    keywords: ['language', 'hindi', 'tamil', 'telugu', 'translation'],
    answer: 'The website interface includes English, Hindi, Tamil and Telugu language options in the navigation bar. Use the language selector to switch the interface.'
  },
  {
    keywords: ['login', 'log in', 'account', 'sign in'],
    answer: 'The current website navigation displays a Log in link. For account access or login support, please use the website	”™s own account flow.'
  },
  {
    keywords: ['contact', 'email', 'mail', 'reach you', 'support', 'help team', 'talk to'],
    answer: `You can contact the IdeaArena team by email at ${WEBSITE_CONTACT_EMAIL}. Tell us what you need help with and include a short description of the issue or question.`
  },
  {
    keywords: ['price', 'pricing', 'cost', 'free', 'subscription', 'payment'],
    answer: 'The current website information shown here does not specify subscription plans or pricing. For the latest details, please contact the IdeaArena team at ' + WEBSITE_CONTACT_EMAIL + '.'
  },
  {
    keywords: ['privacy', 'personal data', 'data safe', 'security'],
    answer: 'Please avoid entering sensitive personal or confidential information into an idea description. For questions about website data handling or privacy, contact the team at ' + WEBSITE_CONTACT_EMAIL + '.'
  },
  {
    keywords: ['competitor', 'competition', 'market research', 'market analysis'],
    answer: 'IdeaArena includes a Competitor Analyst and Market Researcher perspective. They help examine competing solutions, positioning and market opportunities as part of the overall evaluation.'
  },
  {
    keywords: ['what if', 'simulator', 'simulation', 'change pricing', 'target audience'],
    answer: 'The What-if Simulator is designed to explore how changing factors such as pricing, target audiences and business models may affect an idea. It helps you compare possible directions.'
  },
  {
    keywords: ['who made', 'developer', 'creator', 'founder', 'team'],
    answer: 'For questions about the people behind IdeaArena or collaboration opportunities, please contact the team at ' + WEBSITE_CONTACT_EMAIL + '.'
  },
]

function getWebsiteAnswer(question: string): string {
  const normalized = question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  const match = websiteAnswers.find(item => item.keywords.some(keyword => normalized.includes(keyword)))
  if (match) return match.answer

  const websiteTerms = [
    'idea', 'arena', 'website', 'site', 'feature', 'persona', 'agent', 'evaluation',
    'evaluate', 'report', 'submit', 'rbi', 'dataset', 'language', 'price', 'pricing',
    'business', 'market', 'customer', 'investor', 'competitor', 'simulator',
    'simulation', 'score', 'verdict', 'login', 'contact', 'email', 'form'
  ]
  if (websiteTerms.some(term => normalized.includes(term))) {
    return 'I can help with IdeaArena AI	”™s purpose, features, AI personas, idea submission, evaluation process, reports, language options and contact details. I	”™m not fully sure which part you mean	””could you add a little more detail?'
  }

  return 'I	”™m the IdeaArena website assistant, so I can answer questions about this website and how it works. I can	”™t answer unrelated general questions, but I	”™d be happy to help you explore IdeaArena.'
}

function WebsiteChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [username, setUsername] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Welcome to IdeaArena AI! ðŸ‘‹ Before we get started, what should I call you?' }
  ])

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = question.trim()
    if (!value) return

    if (!username) {
      const name = value.replace(/\s+/g, ' ').slice(0, 40)
      setUsername(name)
      setMessages(current => [
        ...current,
        { role: 'user', text: name },
        { role: 'bot', text: `Hello ${name}! ðŸ˜Š How are you today? Welcome to IdeaArena. What would you like to know about our website? I can guide you through the features, AI personas, idea evaluation, reports or contact details.` }
      ])
      setQuestion('')
      return
    }

    const answer = getWebsiteAnswer(value)
    setMessages(current => [...current, { role: 'user', text: value }, { role: 'bot', text: `Hello ${username}! ${answer}` }])
    setQuestion('')
  }

  function chooseSuggestion(value: string) {
    if (!username) {
      setQuestion(value)
      return
    }
    const answer = getWebsiteAnswer(value)
    setMessages(current => [...current, { role: 'user', text: value }, { role: 'bot', text: `Hello ${username}! ${answer}` }])
  }

  return (
    <div className="website-chatbot">
      {isOpen && (
        <section className="website-chat-panel" aria-label="IdeaArena website assistant">
          <header className="website-chat-header">
            <div className="website-chat-avatar">I</div>
            <div className="website-chat-heading">
              <strong>IdeaArena Assistant</strong>
              <span><i /> Website help Â· Online</span>
            </div>
            <button className="website-chat-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">Ã—</button>
          </header>
          <div className="website-chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`website-chat-message ${message.role}`} key={index}>
                {message.text.includes(WEBSITE_CONTACT_EMAIL) ? (
                  <>
                    {message.text.split(WEBSITE_CONTACT_EMAIL)[0]}
                    <a className="website-chat-email" href={`mailto:${WEBSITE_CONTACT_EMAIL}`}>{WEBSITE_CONTACT_EMAIL}</a>
                    {message.text.split(WEBSITE_CONTACT_EMAIL).slice(1).join(WEBSITE_CONTACT_EMAIL)}
                  </>
                ) : message.text}
              </div>
            ))}
          </div>
          {username && (
            <div className="website-chat-suggestions">
              <button type="button" onClick={() => chooseSuggestion('How does IdeaArena work?')}>How it works</button>
              <button type="button" onClick={() => chooseSuggestion('Who are the 10 AI personas?')}>AI personas</button>
              <button type="button" onClick={() => chooseSuggestion('What will my report contain?')}>My report</button>
              <button type="button" onClick={() => chooseSuggestion('How can I contact you?')}>Contact us</button>
            </div>
          )}
          <form className="website-chat-form" onSubmit={sendMessage}>
            <input
              value={username ? question : nameInput}
              onChange={event => username ? setQuestion(event.target.value) : setNameInput(event.target.value)}
              placeholder={username ? 'Ask about IdeaArena...' : 'First, tell me your name...'}
              aria-label={username ? 'Ask about IdeaArena' : 'Enter your name'}
              maxLength={500}
            />
            {!username && (
              <button type="button" disabled={!nameInput.trim()} aria-label="Continue" onClick={() => {
                const name = nameInput.trim().replace(/\s+/g, ' ').slice(0, 40)
                if (!name) return
                setUsername(name)
                setMessages(current => [...current, { role: 'user', text: name }, { role: 'bot', text: `Hello ${name}! ðŸ˜Š How are you today? Welcome to IdeaArena. What would you like to know about our website? I can guide you through the features, AI personas, idea evaluation, reports or contact details.` }])
                setNameInput('')
              }}>→</button>
            )}
            {username && <button type="submit" disabled={!question.trim()} aria-label="Send message">âž¤</button>}
          </form>
          <p className="website-chat-note">Website questions only Â· Your name is used to personalise this chat.</p>
        </section>
      )}
      <button
        className={`website-chat-launcher ${isOpen ? 'active' : ''}`}
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-label={isOpen ? 'Close IdeaArena assistant' : 'Open IdeaArena assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Ã—' : <><span className="chat-launcher-icon">âœ¦</span><span className="chat-launcher-label">Ask us</span></>}
      </button>
    </div>
  )
}

function ReportView({ report, title, language }: { report: Report; title: string; language: LanguageCode }) {
  const rawSegments = Array.isArray(report.customer_segments) ? report.customer_segments : []
  const validSegments = rawSegments
    .map(segment => ({ ...segment, share_percent: Number(segment.share_percent) }))
    .filter(segment => segment.name?.trim() && Number.isFinite(segment.share_percent) && segment.share_percent > 0)
  const segmentTotal = validSegments.reduce((total, segment) => total + segment.share_percent, 0)
  const segments = validSegments.length >= 2 && segmentTotal > 0
    ? validSegments.map(segment => ({ ...segment, share_percent: segment.share_percent / segmentTotal * 100 }))
    : []
  const estimates = (Array.isArray(report.financial_estimates) ? report.financial_estimates : [])
    .map(item => ({ ...item, amount: Number(item.amount) }))
    .filter(item => item.label?.trim() && Number.isFinite(item.amount) && item.amount > 0)
  const maxMoney = Math.max(1, ...estimates.map(item => item.amount))
  return <Localized language={language}><div className="report">
    <div className="report-heading"><div><div className="section-kicker">YOUR IDEA EVALUATION</div><h2>{title}</h2><p>AI-generated strategic assessment Â· Treat projections as estimates, not verified market data.</p></div><div className="score-ring" style={{'--score': `${Math.max(0, Math.min(10, report.score || 0)) * 10}%`} as React.CSSProperties}><strong>{Number(report.score || 0).toFixed(1)}</strong><span>/ 10</span></div></div>
    <div className="kpi-grid"><article className="kpi-card"><span>MARKET POTENTIAL</span><b>{report.market_potential || 'Not assessed'}</b></article><article className="kpi-card"><span>MARKET DEMAND</span><b>{report.market_demand || 'Needs validation'}</b></article><article className="kpi-card"><span>AI CONFIDENCE</span><b>{report.confidence || 'Not specified'}</b></article></div>
    {report.india_evidence && <section className="india-evidence report-card wide">
      <div className="india-evidence-heading">
        <div>
          <span className="section-kicker">INDIA DATASET ANALYSIS</span>
          <h3>India Market Evidence</h3>
        </div>
        <span className="evidence-count">{report.india_evidence.datasets_matched} datasets matched</span>
      </div>

      <div className="evidence-industries">
        <b>Detected industries</b>
        <div>{report.india_evidence.detected_industries.map(item =>
          <span key={item.industry}>{item.industry}</span>
        )}</div>
      </div>

      <p className="evidence-demand-line"><strong>Customer demand:</strong> {report.india_evidence.direct_market_evidence_found
        ? 'Available in matched datasets'
        : 'Not covered by available RBI datasets'}</p>

      {report.india_evidence.contextual_datasets.length > 0 ? <div className="evidence-datasets">
        <b>Matched Indian Datasets</b>
        {report.india_evidence.contextual_datasets.map((item, i) =>
          <article key={`${item.dataset}-${i}`}>
            <strong>{item.dataset.replace(/_/g, ' ').replace(/\.csv$/i, '')}</strong>
            <span>Industry: {item.matched_industry}</span>
            <div className="evidence-metadata">
              <span><b>Data records</b>{item.record_count.toLocaleString()}</span>
              <span><b>Latest data period</b>{item.latest_period || 'Not specified'}</span>
            </div>
            <small>Source: {item.source}</small>
          </article>
        )}
      </div> : <p>No relevant Indian datasets matched this idea.</p>}

      <p className="evidence-disclaimer">Note: These datasets provide economic context. They do not independently prove customer demand, willingness to pay, or market size, and are not used to change the AI score.</p>
    </section>}
    <div className="report-grid">
      <section className="report-card"><h3>Customer segment mix</h3><p className="chart-note">Indicative distribution suggested by the model, not measured customer data.</p>{segments.length ? <div className="segment-chart"><div className="donut" style={{background: `conic-gradient(${segments.map((s,i,arr) => { const start = arr.slice(0,i).reduce((sum,x)=>sum+x.share_percent,0); const end = start+s.share_percent; return `${['#ff7047','#e64d2e','#f5a16f','#a84c32','#75402e'][i%5]} ${start}% ${end}%` }).join(',')})`}}/><div className="legend">{segments.map((s,i)=><div key={`${s.name}-${i}`}><i style={{background:['#ff7047','#e64d2e','#f5a16f','#a84c32','#75402e'][i%5]}}/><span>{s.name}</span><b>{s.share_percent.toFixed(0)}%</b></div>)}</div></div> : <p className="data-unavailable">A reliable customer segment distribution was not provided. Validate the percentages through customer research before displaying a mix.</p>}</section>
      <section className="report-card"><h3>Financial scenario</h3><p className="chart-note">Illustrative amounts only. Confirm with local supplier quotes and actual costs.</p>{estimates.length ? <div className="bar-chart">{estimates.map((x,i)=><div className="bar-row" key={`${x.label}-${i}`}><span>{x.label}</span><div className="bar-track"><i className={x.kind === 'revenue' ? 'revenue' : 'cost'} style={{width:`${Math.max(2,Math.min(100,x.amount/maxMoney*100))}%`}}/></div><b>â‚¹{x.amount.toLocaleString('en-IN')}</b></div>)}</div> : <p className="data-unavailable">Insufficient information to prepare a meaningful financial estimate. Add expected pricing, customer volume and operating costs to build a scenario.</p>}</section>
      <section className="report-card"><h3>What works</h3><ul className="report-list positive">{(report.strengths || []).map((x,i)=><li key={i}>{x}</li>)}</ul></section>
      <section className="report-card"><h3>What needs attention</h3><ul className="report-list caution">{(report.weaknesses || []).map((x,i)=><li key={i}>{x}</li>)}</ul></section>
      <section className="report-card wide"><h3>Business workflow</h3><div className="workflow">{(report.workflow || []).map((x,i)=><div className="workflow-item" key={i}><span>{String(i+1).padStart(2,'0')}</span><b>{x}</b>{i < report.workflow.length-1 && <i>â†“</i>}</div>)}</div></section>
      <section className="report-card wide"><h3>Recommended next moves</h3><div className="recommendations">{(report.recommendations || []).map((x,i)=><article key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></article>)}</div></section>
      <section className="report-card wide verdict"><h3>Final verdict</h3><p>{report.verdict || 'The model did not provide a final verdict.'}</p>{report.assumptions?.length ? <><h4>Assumptions to validate</h4><ul className="report-list">{report.assumptions.map((x,i)=><li key={i}>{x}</li>)}</ul></> : null}</section>
    </div>
  </div></Localized>
}

export default App

