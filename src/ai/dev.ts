
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-potential-conditions.ts';
import '@/ai/flows/assess-symptom-severity.ts';
import '@/ai/flows/refineDiagnosisWithVisualFlow.ts';
import '@/ai/flows/suggest-doctor-specialty.ts';
