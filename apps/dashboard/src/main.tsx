import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Entrypoint } from './entrypoint'
import './styles/index.css'

const entrance = document.querySelector('#app')

if (!entrance) {
  throw new Error('No entrance element found')
}

ReactDOM.createRoot(entrance).render(
  <StrictMode>
    <Entrypoint />
  </StrictMode>,
)
