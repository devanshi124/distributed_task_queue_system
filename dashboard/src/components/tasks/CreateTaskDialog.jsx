import { useState } from 'react'
import { Plus, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { createTask } from '@/api/client'
import { toast } from '@/components/ui/toaster'

const TASK_TYPES = [
  { value: 'send_email',      label: '✉️  Send Email' },
  { value: 'scrape_webpage',  label: '🌐  Scrape Webpage' },
  { value: 'generate_report', label: '📄  Generate PDF Report' },
  { value: 'custom',          label: '⚡  Custom Task' },
]

const PRIORITIES = [
  { value: 'high',   label: '🔴  High' },
  { value: 'medium', label: '🟡  Medium' },
  { value: 'low',    label: '🟢  Low' },
]

function EmailFields({ payload, setPayload }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>To (email)</Label>
        <Input
          placeholder="recipient@example.com"
          value={payload.to || ''}
          onChange={(e) => setPayload((p) => ({ ...p, to: e.target.value }))}
        />
      </div>
      <div>
        <Label>Subject</Label>
        <Input
          placeholder="Email subject"
          value={payload.subject || ''}
          onChange={(e) => setPayload((p) => ({ ...p, subject: e.target.value }))}
        />
      </div>
      <div>
        <Label>Body</Label>
        <Textarea
          rows={4}
          placeholder="Email body…"
          value={payload.body || ''}
          onChange={(e) => setPayload((p) => ({ ...p, body: e.target.value }))}
        />
      </div>
    </div>
  )
}

function ScrapeFields({ payload, setPayload }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>URL to Scrape</Label>
        <Input
          placeholder="https://example.com"
          value={payload.url || ''}
          onChange={(e) => setPayload((p) => ({ ...p, url: e.target.value }))}
        />
      </div>
      <div>
        <Label>Max Links (optional)</Label>
        <Input
          type="number"
          min={1}
          max={50}
          placeholder="10"
          value={payload.max_links || ''}
          onChange={(e) => setPayload((p) => ({ ...p, max_links: parseInt(e.target.value) || undefined }))}
        />
      </div>
    </div>
  )
}

function ReportFields({ payload, setPayload }) {
  const sections = payload.sections || [{ heading: '', content: '' }]

  const updateSection = (idx, field, val) => {
    const updated = sections.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    setPayload((p) => ({ ...p, sections: updated }))
  }

  const addSection = () => setPayload((p) => ({ ...p, sections: [...(p.sections || []), { heading: '', content: '' }] }))
  const removeSection = (idx) => setPayload((p) => ({ ...p, sections: p.sections.filter((_, i) => i !== idx) }))

  return (
    <div className="space-y-3">
      <div>
        <Label>Report Title</Label>
        <Input
          placeholder="My Report"
          value={payload.title || ''}
          onChange={(e) => setPayload((p) => ({ ...p, title: e.target.value }))}
        />
      </div>
      <div>
        <Label>Author (optional)</Label>
        <Input
          placeholder="TaskFlow System"
          value={payload.author || ''}
          onChange={(e) => setPayload((p) => ({ ...p, author: e.target.value }))}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Sections</Label>
          <Button variant="ghost" size="sm" onClick={addSection} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Section
          </Button>
        </div>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {sections.map((s, i) => (
            <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Section heading"
                  value={s.heading}
                  onChange={(e) => updateSection(i, 'heading', e.target.value)}
                  className="text-sm"
                />
                {sections.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => removeSection(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <Textarea
                rows={2}
                placeholder="Section content…"
                value={s.content}
                onChange={(e) => updateSection(i, 'content', e.target.value)}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomFields({ payload, setPayload }) {
  const [raw, setRaw] = useState(() => JSON.stringify(payload, null, 2))
  const [error, setError] = useState('')

  const handleChange = (val) => {
    setRaw(val)
    try {
      setPayload(JSON.parse(val))
      setError('')
    } catch {
      setError('Invalid JSON')
    }
  }

  return (
    <div>
      <Label>JSON Payload</Label>
      <Textarea
        rows={6}
        className="font-mono text-sm mt-1"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        placeholder='{ "key": "value" }'
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export default function CreateTaskDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: '', task_type: 'scrape_webpage', priority: 'medium', max_retries: 3 })
  const [payload, setPayload] = useState({})
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setForm({ name: '', task_type: 'scrape_webpage', priority: 'medium', max_retries: 3 })
    setPayload({})
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Validation Error', description: 'Task name is required.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const task = await createTask({ ...form, payload })
      toast({ title: '✅ Task Created', description: `"${task.name}" dispatched to ${task.priority} queue.`, variant: 'success' })
      onCreated?.(task)
      reset()
      onOpenChange(false)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unknown error'
      toast({ title: 'Failed to create task', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const PayloadEditor = {
    send_email:      EmailFields,
    scrape_webpage:  ScrapeFields,
    generate_report: ReportFields,
    custom:          CustomFields,
  }[form.task_type] || CustomFields

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl">Create New Task</DialogTitle>
          <DialogDescription>Configure and dispatch a task to the queue.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <Label>Task Name *</Label>
              <Input
                placeholder="e.g. Welcome Email to John"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Task Type</Label>
                <Select value={form.task_type} onValueChange={(v) => { setForm((f) => ({ ...f, task_type: v })); setPayload({}) }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Max Retries</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.max_retries}
                onChange={(e) => setForm((f) => ({ ...f, max_retries: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <Separator />

          {/* Dynamic payload */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Payload</p>
            <PayloadEditor payload={payload} setPayload={setPayload} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            <Send className="w-4 h-4" />
            {loading ? 'Dispatching…' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
