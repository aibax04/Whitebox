export interface Factor {
  name: string;
  scaleMin: number;
  scaleMax: number;
  weight: number;
}

export interface ROICalculatorData {
  _id: string;
  name: string;
  userId: string;
  factors: Factor[];
  createdAt?: string;
}

export interface PRDDocument {
  _id: string;
  name: string;
  userId: string;
  calculatorId: string;
  scores: { [key: string]: number };
  finalScore: number;
  createdAt?: string;
}

export interface CreateCalculatorRequest {
  name: string;
  factors: Factor[];
}

export interface SubmitScoresRequest {
  prdName: string;
  fileUrl: string;
  calculatorId: string;
  scores: { [key: string]: number };
}

export interface ROICalculationData {
  calculatorName: string;
  factors: Array<{
    name: string;
    scale: string;
    score: number;
    weight: number;
  }>;
  roiScore: number;
  prdName: string;
}
