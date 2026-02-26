import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to new landing page
const DiagramGeneration = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/diagram-generation', { replace: true });
  }, [navigate]);

  return null;
};

export default DiagramGeneration;
