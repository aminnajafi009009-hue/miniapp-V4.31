import { useState } from "react"
import { toast } from "sonner"
import { adminGet, adminPost } from "@/shared/api/admin"
import { friendlyErrorMessage } from "@/shared/api/client"
import { useLoad } from "@/shared/lib/useLoad"
import { Alert, Button, Card, Chip, Empty, Input, PageSkeleton, PageTop, Row, Section, Segmented, Switch, List } from "@/shared/ui/kit"
import { faDigits } from "@/shared/lib/format"

interface State { enabled: boolean; free_gb: number; daily_mb: number; period_days?: number; categories?: number[]; category_options?: { id: number; name: string }[]; started: number; blocked: number; items: { id: number; name: string; blocked: boolean }[] }

export default function AdminFup() {
  const { data, error, setData } = useLoad<State>(() => adminGet("/fup"))
  const [free, setFree] = useState<string | null>(null)
  const [daily, setDaily] = useState<string | null>(null)
  const [period, setPeriod] = useState<string | null>(null)
  const [unit, setUnit] = useState<"gb" | "mb">("gb")
  const [busy, setBusy] = useState(false)
  const call = async (path: string, body: Record<string, unknown>, ok = "ذخیره شد") => {
    setBusy(true)
    try { setData(await adminPost(path, body)); toast.success(ok); return true }
    catch (e) { toast.error(friendlyErrorMessage(e, "انجام نشد")); return false } finally { setBusy(false) }
  }
  if (error) return <div className="x-page"><PageTop title="مصرف منصفانه" back="/admin/more" /><Alert tone="bad">دریافت ناموفق بود</Alert></div>
  if (!data) return <div className="x-page"><PageTop title="مصرف منصفانه" back="/admin/more" /><PageSkeleton /></div>
  const dailyShown = daily ?? String(unit === "gb" ? +(data.daily_mb / 1024).toFixed(3) : data.daily_mb)
  return (
    <div className="x-page">
      <PageTop title="مصرف منصفانه" sub="برای سرویس‌های نامحدود پنل (به‌جز PAYG)" back="/admin/more" />
      <Alert tone="warn">تا «حد مصرف آزاد» محدودیتی نیست؛ بعد از آن هر روز فقط سهمیه‌ی روزانه مجاز است و با رسیدن به سقف، سرویس تا ساعت ۰۰:۰۰ متوقف می‌شود و کاربر نمی‌تواند فعالش کند.</Alert>
      <Card><div className="x-stack">
        <div className="x-row-flex"><span className="x-grow">فعال</span><Switch checked={data.enabled} onChange={(v) => call("/fup", { enabled: v })} /></div>
        <Input label="حد مصرف آزاد (گیگابایت — در هر بازه‌ی زمانی، یا کل مصرف اگر بازه‌ای نباشد)" type="number" value={free ?? String(data.free_gb)} onChange={(e) => setFree(e.target.value)} />
        {free !== null && <Button variant="primary" loading={busy} onClick={async () => { if (await call("/fup", { free_gb: Number(free) })) setFree(null) }}>ذخیره‌ی حد آزاد</Button>}
        <Input label="بازه‌ی زمانی حد آزاد (روز؛ ۰ = بدون محدودیت زمانی)" type="number" value={period ?? String(data.period_days ?? 0)} onChange={(e) => setPeriod(e.target.value)} />
        {period !== null && <Button variant="primary" loading={busy} onClick={async () => { if (await call("/fup", { period_days: Number(period) || 0 })) setPeriod(null) }}>ذخیره‌ی بازه‌ی زمانی</Button>}
        {(data.period_days ?? 0) > 0 && <Button loading={busy} onClick={async () => { if (await call("/fup", { period_days: 0 }, "محدودیت زمانی برداشته شد")) setPeriod(null) }}>♾ حذف محدودیت زمانی (فقط حجم)</Button>}
        <div className="x-muted">با بازه‌ی زمانی، حد آزاد «در هر بازه» حساب می‌شود؛ با پایان بازه سرویس از مصرف منصفانه خارج و حد آزاد دوباره از صفر شروع می‌شود (دوره‌ها از تاریخ ساخت سرویس).</div>
        <Segmented<"gb" | "mb"> value={unit} options={[{ value: "gb", label: "گیگابایت" }, { value: "mb", label: "مگابایت" }]} onChange={(u) => { setUnit(u); setDaily(null) }} />
        <Input label={`سهمیه‌ی روزانه (${unit === "gb" ? "گیگابایت" : "مگابایت"})`} type="number" value={dailyShown} onChange={(e) => setDaily(e.target.value)} />
        {daily !== null && <Button variant="primary" loading={busy} onClick={async () => { if (await call("/fup", { daily_mb: Number(daily) * (unit === "gb" ? 1024 : 1) })) setDaily(null) }}>ذخیره‌ی سهمیه‌ی روزانه</Button>}
        <div className="x-muted">در مصرف منصفانه: {faDigits(data.started)} · متوقف‌شده: {faDigits(data.blocked)}</div>
      </div></Card>
      <Section title="دسته‌بندی‌های مشمول (هیچ‌کدام انتخاب نشود = همه؛ PAYG هرگز مشمول نیست)">
        <List>
          <Row chevron={false} title="همه‌ی دسته‌ها" right={<Switch checked={(data.categories ?? []).length === 0} onChange={(v) => { if (v) call("/fup", { categories: [] }) }} />} />
          {(data.category_options ?? []).map((o) => {
            const sel = data.categories ?? []
            const on = sel.includes(o.id)
            return <Row key={o.id} chevron={false} title={o.name} right={<Switch checked={on} onChange={(v) => call("/fup", { categories: v ? [...sel, o.id] : sel.filter((x) => x !== o.id) })} />} />
          })}
        </List>
      </Section>
      <Section title="سرویس‌های متوقف‌شده">
        {data.items.length === 0 ? <Empty title="سرویسی متوقف نیست" /> : <List>{data.items.map((s) => (
          <Row key={s.id} chevron={false} title={<span dir="ltr">{s.name}</span>} right={<span className="x-row-flex"><Chip tone="bad">متوقف</Chip>
            <Button size="sm" onClick={() => call(`/fup/${s.id}/release`, {}, "آزاد شد")}>آزادسازی</Button></span>} />
        ))}</List>}
      </Section>
    </div>
  )
}
