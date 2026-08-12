import { Suspense, lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { OrderForm } from './pages/OrderForm'
import { History } from './pages/History'
import { OrderView } from './pages/OrderView'
import { Shop } from './pages/Shop'
import { Status } from './pages/Status'

// Charts are only needed on this route, so they stay out of the order-entry
// bundle.
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))

export default function App() {
  return (
    <HashRouter>
      <main className="app-main">
        <Suspense fallback={<div className="page"><div className="state"><span className="spinner" /></div></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<OrderForm />} />
            <Route path="/orders" element={<History />} />
            <Route path="/orders/:id" element={<OrderView />} />
            <Route path="/orders/:id/edit" element={<OrderForm />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/status" element={<Status />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </HashRouter>
  )
}
