import { 
  ROICalculatorData, 
  PRDDocument, 
  CreateCalculatorRequest, 
  SubmitScoresRequest 
} from '@/types/roi';

class ROIApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async fetchCalculators(): Promise<ROICalculatorData[]> {
    const response = await fetch('/api/calculators', {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      throw new Error('Failed to fetch calculators');
    }

    return response.json();
  }

  async fetchDocuments(): Promise<PRDDocument[]> {
    const response = await fetch('/api/prds', {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  }

  async createCalculator(data: CreateCalculatorRequest): Promise<ROICalculatorData> {
    const response = await fetch('/api/calculator', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      throw new Error('Failed to create calculator');
    }

    return response.json();
  }

  async getCalculator(calculatorId: string): Promise<ROICalculatorData> {
    const response = await fetch(`/api/calculator/${calculatorId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      if (response.status === 404) {
        throw new Error('Calculator not found');
      }
      throw new Error('Failed to fetch calculator');
    }

    return response.json();
  }

  async submitScores(data: SubmitScoresRequest): Promise<PRDDocument> {
    const response = await fetch('/api/submit-scores', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      throw new Error('Failed to submit scores');
    }

    return response.json();
  }

  async deleteCalculator(calculatorId: string): Promise<void> {
    const response = await fetch(`/api/calculator/${calculatorId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      if (response.status === 404) {
        throw new Error('Calculator not found');
      }
      throw new Error('Failed to delete calculator');
    }
  }

  async deleteDocument(prdId: string): Promise<void> {
    const response = await fetch(`/api/prd/${prdId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication Error: Please log in again');
      }
      if (response.status === 404) {
        throw new Error('PRD not found');
      }
      throw new Error('Failed to delete PRD');
    }
  }
}

export const roiApiService = new ROIApiService();
