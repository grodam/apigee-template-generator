import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './components/Home/HomePage';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import { KvmPage } from './components/Kvm/KvmPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generator" element={<CanvasContainer />} />
          <Route path="/kvm" element={<KvmPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
