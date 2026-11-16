import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { IsuProvinsi } from '@/pages/IsuProvinsi'
import { IsuPimpinan } from '@/pages/IsuPimpinan'
import { PemberitaanOpd } from '@/pages/PemberitaanOpd'
import { EarlyWarning } from '@/pages/EarlyWarning'
import { DetailIsu } from '@/pages/DetailIsu'
import { TindakLanjut } from '@/pages/TindakLanjut'
import { DataSumber } from '@/pages/DataSumber'
import { UploadData } from '@/pages/UploadData'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/isu-provinsi" element={<IsuProvinsi />} />
        <Route path="/isu-pimpinan" element={<IsuPimpinan />} />
        <Route path="/pemberitaan-opd" element={<PemberitaanOpd />} />
        <Route path="/early-warning" element={<EarlyWarning />} />
        <Route path="/isu/:id" element={<DetailIsu />} />
        <Route path="/tindak-lanjut" element={<TindakLanjut />} />
        <Route path="/data-sumber" element={<DataSumber />} />
        <Route path="/upload-data" element={<UploadData />} />
      </Route>
    </Routes>
  )
}

export default App
