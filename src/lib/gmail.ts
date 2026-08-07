export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  unread: boolean;
  body?: string;
  labels?: string[];
}

export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 15
): Promise<GmailMessageSummary[]> {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.append('maxResults', maxResults.toString());
  if (query) {
    url.searchParams.append('q', query);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengambil daftar email (${res.status})`);
  }

  const data = await res.json();
  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  // Fetch full details for the first N messages in parallel
  const detailsPromises = data.messages.map((m: { id: string }) =>
    getGmailMessageDetails(accessToken, m.id)
  );

  const results = await Promise.allSettled(detailsPromises);
  const messages: GmailMessageSummary[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      messages.push(r.value);
    }
  }

  return messages;
}

export async function getGmailMessageDetails(
  accessToken: string,
  messageId: string
): Promise<GmailMessageSummary | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const headers: Array<{ name: string; value: string }> = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('From');
  const to = getHeader('To');
  const subject = getHeader('Subject') || '(Tanpa Subjek)';
  const date = getHeader('Date');
  const labelIds: string[] = data.labelIds || [];
  const unread = labelIds.includes('UNREAD');

  // Extract body text
  let body = '';
  if (data.payload?.body?.data) {
    body = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    body = parseMessageParts(data.payload.parts);
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    from,
    to,
    subject,
    date,
    unread,
    body: body || data.snippet || '',
    labels: labelIds,
  };
}

function parseMessageParts(parts: any[]): string {
  let text = '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.mimeType === 'text/html' && part.body?.data && !text) {
      // Stripped simple text or raw html fallback
      text = decodeBase64Url(part.body.data).replace(/<[^>]*>?/gm, '');
    }
    if (part.parts) {
      const nested = parseMessageParts(part.parts);
      if (nested) return nested;
    }
  }
  return text;
}

function decodeBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(
      escape(window.atob(base64))
    );
  } catch (e) {
    return str;
  }
}

function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> {
  // Construct MIME RFC 822 formatted string
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${window.btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ];

  const rawEmail = emailLines.join('\r\n');
  const encodedRaw = encodeBase64Url(rawEmail);

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengirim email (${res.status})`);
  }

  return await res.json();
}

export async function trashGmailMessage(
  accessToken: string,
  messageId: string
): Promise<boolean> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return res.ok;
}
