import { useState } from 'react'

interface Props {
  onSubmit: (token: string) => void
}

export default function TokenPage({ onSubmit }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  return (
    <div className="token-page">
      <form className="token-card" onSubmit={handleSubmit}>
        <h1>CMS Banner Management</h1>
        <p>Enter your access token to continue</p>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Paste your access token here..."
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
          Continue
        </button>
      </form>
    </div>
  )
}
