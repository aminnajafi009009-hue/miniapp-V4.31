import { useState } from "react"
import { adminGet } from "@/shared/api/admin"
import { useLoad } from "@/shared/lib/useLoad"
import { Alert, BarChart, Card, Donut, KV, PageSkeleton, PageTop, Row, Section, Segmented, Stat, List, Empty } from "@/shared/ui/kit"
import { faDigits, num, toman } from "@/shared/lib/format"

const TYPE: Record<string, string> = { new: "سرویس آماده", custom: "سرویس سفارشی", renew: "تمدید" }
const COLORS = ["var(--accent)", "#f5a524", "#34d399", "var(--accent-2)", "#f472b6"]
const lbl = (d: any) => String(d.d || "").slice(5)

export default function AdminReports() {
  const [days, setDays] = useState(30)
  const { data, error } = useLoad<any>(() => adminGet(`/reports?days=${days}`), [days])
  const s = data?.summary
  const series: any[] = data?.series || []
  const byType: any[] = data?.by_type || []
  const byMethod: any[] = data?.by_method || []
  return (
    <div className="x-page">
      <PageTop title="گزارش فروش" back="/admin" />
      <Segmented<number> value={days} options={[{ value: 7, label: "۷ روز" }, { value: 30, label: "۳۰ روز" }, { value: 90, label: "۹۰ روز" }]} onChange={setDays} />
      {error ? <Alert tone="bad">دریافت گزارش ناموفق بود.</Alert> : !data || !s ? <PageSkeleton /> : (
        <>
          <div className="x-grid c2">
            <Stat label="درآمد کل (فروش + تمدید)" value={num(s.total_revenue)} sub="تومان" />
            <Stat label="تعداد سفارش پولی" value={num(s.orders_count)} sub={`میانگین ${num(s.avg_per_order)} تومان`} />
            <Stat label="فروش جدید" value={num(s.sales_amount)} sub={`${faDigits(s.sales_count)} عدد`} />
            <Stat label="تمدید" value={num(s.renew_amount)} sub={`${faDigits(s.renew_count)} عدد · ${faDigits(s.renew_pct)}٪ درآمد`} />
            <Stat label="تست رایگان" value={num(s.test_count)} sub={`${faDigits(s.testers)} نفر`} />
            <Stat label="کاربر جدید" value={num(s.new_users)} />
            <Stat label="شارژ کیف پول" value={num(s.wallet_charged)} sub={`${faDigits(s.wallet_charge_count)} بار`} />
            <Stat label="خریداران" value={num(s.buyers)} sub={`میانگین ${num(s.avg_per_customer)} تومان`} />
          </div>
          <Section title="درآمد کل روزانه"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: d.revenue }))} format={toman} height={140} /></Card></Section>
          <Section title="فروش جدید روزانه (آماده + سفارشی)"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: (d.new_amount || 0) + (d.custom_amount || 0) }))} format={toman} /></Card></Section>
          <Section title="تمدید روزانه (مبلغ)">
            <Card>
              <BarChart data={series.map((d) => ({ label: lbl(d), value: d.renew_amount || 0 }))} format={toman} />
              <div className="x-stack" style={{ gap: 6, marginTop: 8 }}>
                <KV k="تمدید سرویس آماده" v={`${faDigits(s.renew_plan_count)} · ${num(s.renew_plan_amount)}`} />
                <KV k="تمدید سرویس سفارشی" v={`${faDigits(s.renew_custom_count)} · ${num(s.renew_custom_amount)}`} />
                <KV k="تعداد تمدیدکننده" v={faDigits(s.renewers)} />
              </div>
            </Card>
          </Section>
          <Section title="تعداد تمدید روزانه"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: d.renew_count || 0 }))} /></Card></Section>
          <Section title="تست رایگان روزانه"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: d.tests || 0 }))} /></Card></Section>
          <Section title="شارژ کیف پول روزانه"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: d.wallet_charged || 0 }))} format={toman} /></Card></Section>
          <Section title="کاربر جدید روزانه"><Card><BarChart data={series.map((d) => ({ label: lbl(d), value: d.users || 0 }))} /></Card></Section>
          {byType.length > 0 && (
            <Section title="نوع سفارش"><Card><div className="x-row-flex">
              <Donut parts={byType.map((t: any, i: number) => ({ value: t.s, color: COLORS[i % COLORS.length], label: t.t }))} center={<b className="num">{faDigits(byType.reduce((a: number, t: any) => a + t.c, 0))}</b>} />
              <div className="x-grow x-stack" style={{ gap: 6 }}>{byType.map((t: any, i: number) => <KV key={t.t} k={<span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length], marginInlineEnd: 6 }} />{TYPE[t.t] || t.t}</span>} v={`${faDigits(t.c)} · ${num(t.s)}`} />)}</div>
            </div></Card></Section>
          )}
          {byMethod.length > 0 && (
            <Section title="روش پرداخت"><Card><div className="x-stack" style={{ gap: 6 }}>{byMethod.map((m: any) => <KV key={m.m} k={m.m} v={`${faDigits(m.c)} · ${num(m.s)}`} />)}</div></Card></Section>
          )}
          <Section title="پرفروش‌ترین پلن‌ها">{(data.top_plans || []).length === 0 ? <Empty title="داده‌ای نیست" /> : <List>{data.top_plans.map((p: any, i: number) => <Row key={i} chevron={false} title={p.name} sub={`${faDigits(p.c)} فروش`} right={<b className="num">{num(p.s)}</b>} />)}</List>}</Section>
          <Section title="پرتمدیدترین پلن‌ها">{(data.top_renew_plans || []).length === 0 ? <Empty title="داده‌ای نیست" /> : <List>{data.top_renew_plans.map((p: any, i: number) => <Row key={i} chevron={false} title={p.name} sub={`${faDigits(p.c)} تمدید`} right={<b className="num">{num(p.s)}</b>} />)}</List>}</Section>
          <Section title="بهترین مشتریان">{(data.top_buyers || []).length === 0 ? <Empty title="داده‌ای نیست" /> : <List>{data.top_buyers.map((p: any) => <Row key={p.telegram_id} href={`/admin/users/${p.telegram_id}`} title={p.name} sub={`${faDigits(p.c)} سفارش`} right={<b className="num">{num(p.s)}</b>} />)}</List>}</Section>
        </>
      )}
    </div>
  )
}
