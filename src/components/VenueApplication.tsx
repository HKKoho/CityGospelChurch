import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  date: string;
  start: string;
  end: string;
}

const VENUE_TYPES = ['全場', '禮堂', '草地', '一般房間'] as const;
const ACTIVITY_NATURES = ['福音性聚會', '課程、研討會、教育性聚會', '文娛康樂'] as const;
const ACTIVITY_MODES = ['公開聚會', '會內聚會', '收費活動'] as const;
const AUDIENCES = ['兒童', '親子', '青少年', '成年', '長者', '其他'] as const;
const ATTENDANCE_RANGES = ['20 人或以下', '21–50 人', '51–100 人', '101–200 人', '200 人以上'] as const;
const TITLES = ['先生', '女士'] as const;

const emptySession = (): Session => ({ date: '', start: '09:00', end: '12:00' });

export const VenueApplication: React.FC = () => {
  // Applicant
  const [organization, setOrganization] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactTitle, setContactTitle] = useState<string>('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Venue
  const [venueType, setVenueType] = useState<string>('');
  const [roomCount, setRoomCount] = useState<string>('1');

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([emptySession()]);

  // Activity
  const [activityNature, setActivityNature] = useState<string>('');
  const [activityMode, setActivityMode] = useState<string>('');
  const [activityFee, setActivityFee] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [attendanceRange, setAttendanceRange] = useState<string>('');

  // Description & rep
  const [description, setDescription] = useState('');
  const [repName, setRepName] = useState('');
  const [repTitle, setRepTitle] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleAudience = (a: string) => {
    setTargetAudience(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const addSession = () => {
    if (sessions.length < 3) setSessions(prev => [...prev, emptySession()]);
  };

  const removeSession = (i: number) => {
    setSessions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateSession = (i: number, field: keyof Session, value: string) => {
    setSessions(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!organization.trim()) e.organization = '必填';
    if (!contactPerson.trim()) e.contactPerson = '必填';
    if (!contactTitle) e.contactTitle = '必填';
    if (!mobile.trim()) e.mobile = '必填';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = '請輸入有效電郵';
    if (!venueType) e.venueType = '請選擇場地';
    sessions.forEach((s, i) => {
      if (!s.date) e[`session_date_${i}`] = '請選擇日期';
      if (s.start >= s.end) e[`session_time_${i}`] = '結束時間須晚於開始時間';
    });
    if (!activityNature) e.activityNature = '請選擇活動性質';
    if (!activityMode) e.activityMode = '請選擇活動方式';
    if (activityMode === '收費活動' && !activityFee) e.activityFee = '請輸入收費金額';
    if (targetAudience.length === 0) e.targetAudience = '請至少選擇一項';
    if (!attendanceRange) e.attendanceRange = '請選擇人數範圍';
    if (!description.trim()) e.description = '必填';
    if (!repName.trim()) e.repName = '必填';
    if (!repTitle) e.repTitle = '必填';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('請填寫所有必填項目');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        organization,
        contact_person: contactPerson,
        contact_title: contactTitle,
        mobile,
        email,
        venue_type: venueType,
        room_count: venueType === '一般房間' ? parseInt(roomCount) : null,
        sessions,
        activity_nature: activityNature,
        activity_mode: activityMode,
        activity_fee: activityMode === '收費活動' ? parseFloat(activityFee) : null,
        target_audience: targetAudience,
        attendance_range: attendanceRange,
        description,
        rep_name: repName,
        rep_title: repTitle,
      };
      const { error } = await supabase.from('venue_applications').insert(payload);
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error('提交失敗，請重試或聯絡中心。');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 space-y-4"
      >
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h3 className="text-2xl font-heading font-bold">申請已提交</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          感謝您的申請！1cm 中心職員將盡快與您聯絡確認。
        </p>
        <p className="text-sm text-muted-foreground">
          查詢請致電 9732 7217 或電郵至 info@1cm.org.hk
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-4">
          提交新申請
        </Button>
      </motion.div>
    );
  }

  const fieldError = (key: string) => errors[key] ? (
    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />{errors[key]}
    </p>
  ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Section 1: Applicant ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            申請機構資料
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">申請教會 / 團體 / 機構 <span className="text-destructive">*</span></label>
            <Input
              value={organization}
              onChange={e => setOrganization(e.target.value)}
              placeholder="機構名稱"
              className={errors.organization ? 'border-destructive' : ''}
            />
            {fieldError('organization')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">負責人 <span className="text-destructive">*</span></label>
              <Input
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="姓名"
                className={errors.contactPerson ? 'border-destructive' : ''}
              />
              {fieldError('contactPerson')}
            </div>
            <div>
              <label className="text-sm font-medium">稱謂 <span className="text-destructive">*</span></label>
              <Select value={contactTitle} onValueChange={setContactTitle}>
                <SelectTrigger className={errors.contactTitle ? 'border-destructive' : ''}>
                  <SelectValue placeholder="選擇" />
                </SelectTrigger>
                <SelectContent>
                  {TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('contactTitle')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">手提電話 <span className="text-destructive">*</span></label>
              <Input
                inputMode="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="例：91234567"
                className={errors.mobile ? 'border-destructive' : ''}
              />
              {fieldError('mobile')}
            </div>
            <div>
              <label className="text-sm font-medium">電郵 <span className="text-destructive">*</span></label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {fieldError('email')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Venue & Dates ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
            借用場地及時間
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">借用場地 <span className="text-destructive">*</span></label>
              <Select value={venueType} onValueChange={setVenueType}>
                <SelectTrigger className={errors.venueType ? 'border-destructive' : ''}>
                  <SelectValue placeholder="請選擇場地" />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('venueType')}
            </div>

            <AnimatePresence>
              {venueType === '一般房間' && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <label className="text-sm font-medium">房間數目</label>
                  <Select value={roomCount} onValueChange={setRoomCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} 間</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sessions */}
          <div className="space-y-3">
            <label className="text-sm font-medium">借用日期及時間 <span className="text-destructive">*</span></label>
            {sessions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
              >
                <div>
                  <label className="text-xs text-muted-foreground">日期（{['一','二','三'][i]}）</label>
                  <Input
                    type="date"
                    value={s.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => updateSession(i, 'date', e.target.value)}
                    className={errors[`session_date_${i}`] ? 'border-destructive' : ''}
                  />
                  {fieldError(`session_date_${i}`)}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">開始時間</label>
                  <Input
                    type="time"
                    value={s.start}
                    onChange={e => updateSession(i, 'start', e.target.value)}
                    className={errors[`session_time_${i}`] ? 'border-destructive' : ''}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">結束時間</label>
                  <Input
                    type="time"
                    value={s.end}
                    onChange={e => updateSession(i, 'end', e.target.value)}
                  />
                  {fieldError(`session_time_${i}`)}
                </div>
                <div className="pt-5">
                  {sessions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSession(i)}
                      className="text-muted-foreground hover:text-destructive h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}

            {sessions.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSession}
                className="mt-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                新增日期
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Activity ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
            活動資料
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">活動性質 <span className="text-destructive">*</span></label>
              <Select value={activityNature} onValueChange={setActivityNature}>
                <SelectTrigger className={errors.activityNature ? 'border-destructive' : ''}>
                  <SelectValue placeholder="請選擇" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_NATURES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('activityNature')}
            </div>

            <div>
              <label className="text-sm font-medium">活動方式 <span className="text-destructive">*</span></label>
              <Select value={activityMode} onValueChange={v => { setActivityMode(v); setActivityFee(''); }}>
                <SelectTrigger className={errors.activityMode ? 'border-destructive' : ''}>
                  <SelectValue placeholder="請選擇" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('activityMode')}
            </div>
          </div>

          <AnimatePresence>
            {activityMode === '收費活動' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label className="text-sm font-medium">收費金額 (HKD) <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={activityFee}
                  onChange={e => setActivityFee(e.target.value)}
                  placeholder="例：100"
                  className={`max-w-[180px] ${errors.activityFee ? 'border-destructive' : ''}`}
                />
                {fieldError('activityFee')}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-sm font-medium mb-2 block">
              服侍對象群 <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAudience(a)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    targetAudience.includes(a)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            {fieldError('targetAudience')}
          </div>

          <div>
            <label className="text-sm font-medium">預計參與人數 <span className="text-destructive">*</span></label>
            <Select value={attendanceRange} onValueChange={setAttendanceRange}>
              <SelectTrigger className={`max-w-[220px] ${errors.attendanceRange ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="請選擇人數範圍" />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {fieldError('attendanceRange')}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Description & Rep ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
            活動詳情及現場代表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              簡述活動內容及所需物資 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="請簡述活動內容、流程及預計所需設備或物資（例如：投影機、麥克風、椅子數量等）"
              className={`w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.description ? 'border-destructive' : 'border-input'
              }`}
            />
            {fieldError('description')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">現場代表姓名 <span className="text-destructive">*</span></label>
              <Input
                value={repName}
                onChange={e => setRepName(e.target.value)}
                placeholder="負責處理聚會期間一切事宜的代表"
                className={errors.repName ? 'border-destructive' : ''}
              />
              {fieldError('repName')}
            </div>
            <div>
              <label className="text-sm font-medium">稱謂 <span className="text-destructive">*</span></label>
              <Select value={repTitle} onValueChange={setRepTitle}>
                <SelectTrigger className={errors.repTitle ? 'border-destructive' : ''}>
                  <SelectValue placeholder="選擇" />
                </SelectTrigger>
                <SelectContent>
                  {TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('repTitle')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <p className="text-xs text-muted-foreground">
          提交後，1cm 中心職員將審核申請並與您聯絡確認。<br />
          查詢：9732 7217 ／ info@1cm.org.hk
        </p>
        <Button type="submit" size="lg" disabled={submitting} className="shrink-0">
          {submitting ? '提交中...' : (
            <>提交申請 <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </div>
    </form>
  );
};
