import { useEffect } from "react";
import Dashboard from '../components/Dashboard';

const Index = () => {
  useEffect(() => {
    document.title = 'AN-TIC | Dashboard';
  }, []);
  return <Dashboard />;
};

export default Index;
