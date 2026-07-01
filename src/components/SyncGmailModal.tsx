import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Check, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Subscription } from '../types';

interface SyncGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onConfirmAddSubscription: (sub: Omit<Subscription, 'id' | 'userId'>) => void;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
}

export default function SyncGmailModal({
  isOpen,
  onClose,
  accessToken,
  onConfirmAddSubscription,
}: SyncGmailModalProps) {
  
  const [emails, setEmails] = useState<GmailMessageDetail[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [parsingEmailId, setParsingEmailId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parsed Draft State
  const [parsedDraft, setParsedDraft] = useState<Omit<Subscription, 'id' | 'userId'> | null>(null);

  if (!isOpen) return null;

  // Safe base64 decoding helper
  const decodeBase64Safe = (str: string): string => {
    try {
      const normalizedStr = str.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(window.atob(normalizedStr)));
    } catch (e) {
      try {
        const normalizedStr = str.replace(/-/g, '+').replace(/_/g, '/');
        return window.atob(normalizedStr);
      } catch (err) {
        return "";
      }
    }
  };

  // Traverses parts recursively to extract plain text body
  const extractBodyText = (payload: any): string => {
    if (!payload) return "";
    
    if (payload.mimeType === "text/plain" && payload.body?.data) {
      return decodeBase64Safe(payload.body.data);
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        const text = extractBodyText(part);
        if (text) return text;
      }
    }
    
    return "";
  };

  // Fetch from Google Gmail API
  const handleFetchEmails = async () => {
    if (!accessToken) {
      setErrorMessage("OAuth token not available. Please sign in with Google first.");
      return;
    }

    setIsLoadingEmails(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setParsedDraft(null);

    try {
      // Search query targeting typical payment confirmations
      const query = "subject:(subscription OR confirmation OR billing OR receipt OR invoice OR charged OR recurring OR order)";
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Gmail API returned status ${response.status}. Please try re-signing in.`);
      }

      const data = await response.json();
      
      if (!data.messages || data.messages.length === 0) {
        setEmails([]);
        setSuccessMessage("No recent subscription confirmation emails found in your inbox.");
        setIsLoadingEmails(false);
        return;
      }

      // Fetch details for each message
      const detailedMessages: GmailMessageDetail[] = [];
      
      for (const msg of data.messages) {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const headers: GmailMessageHeader[] = detailData.payload?.headers || [];
          
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
          const dateStr = headers.find(h => h.name === 'Date')?.value || '';
          
          const bodyText = extractBodyText(detailData.payload);

          detailedMessages.push({
            id: msg.id,
            snippet: detailData.snippet || '',
            subject,
            from,
            date: dateStr,
            bodyText: bodyText || detailData.snippet || ''
          });
        }
      }

      setEmails(detailedMessages);
      setSuccessMessage(`Found ${detailedMessages.length} potential subscription emails!`);
    } catch (error: any) {
      console.error("Failed fetching Gmail emails:", error);
      setErrorMessage(error?.message || "Failed to sync emails. Make sure your Google Auth session is active.");
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Call server route to trigger server-side Gemini parsing
  const handleParseEmail = async (email: GmailMessageDetail) => {
    setParsingEmailId(email.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setParsedDraft(null);

    try {
      const response = await fetch('/api/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: email.subject,
          body: `Sender: ${email.from}\nSnippet: ${email.snippet}\nDate: ${email.date}\nContent:\n${email.bodyText.slice(0, 1500)}`
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "AI parser encountered an issue.");
      }

      const parsedData = await response.json();
      setParsedDraft({
        name: parsedData.name || 'Unknown',
        amount: parsedData.amount || 0,
        currency: parsedData.currency || 'USD',
        billingCycle: (parsedData.billingCycle?.toLowerCase() || 'monthly') as any,
        nextBillingDate: parsedData.nextBillingDate || new Date().toISOString().split('T')[0],
        paymentMethod: parsedData.paymentMethod || 'Autopay',
        status: 'active',
        category: (parsedData.category || 'Other') as any,
        notes: parsedData.notes || `Parsed from Gmail email: "${email.subject}"`
      });

      setSuccessMessage("AI successfully parsed subscription parameters!");
    } catch (error: any) {
      console.error("AI parsing error:", error);
      setErrorMessage(error?.message || "Failed to parse email details. Fill subscription manually if needed.");
    } finally {
      setParsingEmailId(null);
    }
  };

  const handleConfirmAddDraft = () => {
    if (parsedDraft) {
      onConfirmAddSubscription(parsedDraft);
      setParsedDraft(null);
      setSuccessMessage("Subscription added successfully!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] rounded-2xl shadow-2xl border border-white/5 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-[#1c1c1f] border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
                Scan Gmail Confirmation Receipts
                <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5 animate-spin" /> Gemini AI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Automatically discover and pre-fill subscription billing rates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Status logs */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!accessToken ? (
            <div className="text-center py-8 space-y-4">
              <Mail className="h-12 w-12 text-slate-600 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You must be logged in to Google to sync directly. Please click the <b>Sign in with Google</b> button in the top header.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Scan Actions */}
              <div className="flex justify-between items-center bg-[#1c1c1f] border border-white/5 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-semibold">Authorized to scan incoming invoices</span>
                </div>
                <button
                  onClick={handleFetchEmails}
                  disabled={isLoadingEmails}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isLoadingEmails ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      <span>Scan Inbox</span>
                    </>
                  )}
                </button>
              </div>

              {/* Email List */}
              {emails.length > 0 && !parsedDraft && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 block">Recent Emails Found</span>
                  <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-[#1c1c1f]">
                    {emails.map((email) => (
                      <div 
                        key={email.id} 
                        className="p-3 hover:bg-white/[0.01] transition flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1 max-w-[70%]">
                          <p className="font-bold text-slate-200 truncate">{email.subject}</p>
                          <p className="text-[10px] text-slate-400 truncate">From: {email.from}</p>
                          <p className="text-[10px] text-slate-500 italic line-clamp-1">"{email.snippet}"</p>
                        </div>
                        <button
                          onClick={() => handleParseEmail(email)}
                          disabled={parsingEmailId !== null}
                          className="bg-[#121214] hover:bg-black text-white font-bold text-[10px] py-1.5 px-3 rounded-lg border border-white/5 hover:border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {parsingEmailId === email.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>AI Parsing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-indigo-400" />
                              <span>AI Auto-Parse</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Pre-filled Draft Card */}
              {parsedDraft && (
                <div className="bg-indigo-500/[0.03] border-2 border-indigo-500/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-350">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                      <h4 className="font-extrabold text-sm text-indigo-300">Gemini Extracted Draft Card</h4>
                    </div>
                    <button 
                      onClick={() => setParsedDraft(null)}
                      className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
                    >
                      Clear Draft
                    </button>
                  </div>

                  {/* Form fields review */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Subscription Name</label>
                      <input 
                        type="text" 
                        value={parsedDraft.name}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, name: e.target.value })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Price / Amount</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={parsedDraft.currency}
                          onChange={(e) => setParsedDraft({ ...parsedDraft, currency: e.target.value })}
                          className="w-16 text-center bg-[#121214] border border-white/5 rounded-lg p-2 font-bold text-indigo-400 uppercase focus:outline-none"
                        />
                        <input 
                          type="number" 
                          step="0.01"
                          value={parsedDraft.amount}
                          onChange={(e) => setParsedDraft({ ...parsedDraft, amount: Number(e.target.value) })}
                          className="flex-1 bg-[#121214] border border-white/5 rounded-lg p-2 font-extrabold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Billing Cycle</label>
                      <select 
                        value={parsedDraft.billingCycle}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, billingCycle: e.target.value as any })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-semibold text-slate-300 focus:outline-none"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Estimated Next Billing Date</label>
                      <input 
                        type="date" 
                        value={parsedDraft.nextBillingDate}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, nextBillingDate: e.target.value })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Category</label>
                      <select 
                        value={parsedDraft.category}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, category: e.target.value as any })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-semibold text-slate-300 focus:outline-none"
                      >
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Health & Fitness">Health & Fitness</option>
                        <option value="Software & Services">Software & Services</option>
                        <option value="Financial">Financial</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Payment Mode</label>
                      <input 
                        type="text" 
                        value={parsedDraft.paymentMethod}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, paymentMethod: e.target.value })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="font-bold text-slate-400">AI Notes & Context</label>
                      <textarea 
                        rows={2}
                        value={parsedDraft.notes}
                        onChange={(e) => setParsedDraft({ ...parsedDraft, notes: e.target.value })}
                        className="w-full bg-[#121214] border border-white/5 rounded-lg p-2 font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleConfirmAddDraft}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>Confirm & Save to Subscriptions</span>
                    </button>
                    <button
                      onClick={() => setParsedDraft(null)}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer border border-white/5"
                    >
                      Cancel
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#1c1c1f] px-6 py-3.5 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer animate-pulse"
          >
            Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
}
