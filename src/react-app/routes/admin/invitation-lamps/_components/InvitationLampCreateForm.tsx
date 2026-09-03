import { useInkUI } from '@app/components/providers/InkUIProvider';
import { InkButton } from '@app/components/ui/InkButton';
import { InkInput } from '@app/components/ui/InkInput';
import { useNavigate } from 'react-router';
import { useState } from 'react';

const LAMP_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function InvitationLampCreateForm() {
  const { pushToast } = useInkUI();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [referrerUserId, setReferrerUserId] = useState('');
  const [note, setNote] = useState('');
  const [totalLimit, setTotalLimit] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const submit = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode && !LAMP_CODE_PATTERN.test(trimmedCode)) {
      pushToast({
        message: '灯引格式错误（如 ABCD-EFGH）',
        tone: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: trimmedCode || undefined,
        referrerUserId: referrerUserId.trim() || undefined,
        note: note.trim() || undefined,
        totalLimit: totalLimit.trim() ? Number(totalLimit.trim()) : 1,
        expiresAt: expiresAt || undefined,
      };

      const response = await fetch('/api/admin/invitation-lamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? '创建灯引失败');
      }

      const finalCode = data.invitationLamp?.code || '';
      setCreatedCode(finalCode);
      pushToast({
        message: finalCode ? `创建成功：${finalCode}` : '灯引创建成功',
        tone: 'success',
      });
      navigate('/admin/invitation-lamps');
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : '创建灯引失败',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <InkInput
        label="灯引码（可选，留空自动生成）"
        value={code}
        onChange={(value) => setCode(value.toUpperCase())}
        placeholder="例如：ABCD-EFGH"
        disabled={loading}
      />

      <InkInput
        label="引荐人 UserID（可选）"
        value={referrerUserId}
        onChange={setReferrerUserId}
        placeholder="持灯人的用户 ID"
        disabled={loading}
      />

      <InkInput
        label="备注（可选）"
        value={note}
        onChange={setNote}
        placeholder="例如：某某渠道引荐码"
        disabled={loading}
      />

      <InkInput
        label="引荐名额（默认 1）"
        value={totalLimit}
        onChange={setTotalLimit}
        placeholder="例如：3"
        disabled={loading}
      />

      <InkInput
        label="过期时间（可选，留空=永不过期）"
        type="datetime-local"
        value={expiresAt}
        onChange={(value) => setExpiresAt(value)}
        disabled={loading}
      />

      {createdCode && (
        <p className="text-ink-secondary text-sm">
          最新创建灯引：<span className="font-mono">{createdCode}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <InkButton variant="primary" onClick={submit} disabled={loading}>
          {loading ? '创建中...' : '创建灯引'}
        </InkButton>
        <InkButton href="/admin/invitation-lamps" variant="secondary">
          返回列表
        </InkButton>
      </div>
    </div>
  );
}
