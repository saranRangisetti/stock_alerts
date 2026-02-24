"use client";

import { useState, useEffect } from "react";
import { Mail, Send, Check, AlertCircle, Eye, EyeOff, ExternalLink } from "lucide-react";

export default function EmailSettings() {
  const [senderEmail, setSenderEmail] = useState("");
  const [senderAppPassword, setSenderAppPassword] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSenderEmail(data.senderEmail || "");
        setRecipientEmail(data.recipientEmail || "");
        setEnabled(data.enabled || false);
        setHasPassword(data.hasPassword || false);
      })
      .catch(() => {});
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail,
          senderAppPassword,
          recipientEmail,
          enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage("success", "Settings saved!");
      if (senderAppPassword) {
        setHasPassword(true);
        setSenderAppPassword("");
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail,
          senderAppPassword: senderAppPassword || undefined,
          recipientEmail,
          testEmail: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage("success", "Test email sent! Check your inbox.");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Mail size={20} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
            <p className="text-zinc-500 text-sm">Get emailed when tracked items restock</p>
          </div>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between mb-6 p-3 bg-zinc-800/50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">Enable email alerts</p>
            <p className="text-xs text-zinc-500">Receive an email when items come back in stock</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? "bg-green-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Gmail setup guide */}
        <div className="mb-6 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
          <p className="text-xs text-blue-400 font-medium mb-1">Gmail App Password Setup</p>
          <p className="text-xs text-zinc-500">
            You need a Gmail App Password (not your regular password).{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              Create one here <ExternalLink size={10} />
            </a>
          </p>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Sender Gmail Address
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="your-email@gmail.com"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Gmail App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={senderAppPassword}
                onChange={(e) => setSenderAppPassword(e.target.value)}
                placeholder={hasPassword ? "Password saved (enter new to update)" : "xxxx xxxx xxxx xxxx"}
                className="w-full px-3 py-2 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="notifications@example.com"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
            />
            <p className="text-xs text-zinc-600 mt-1">Can be the same as sender, or any email</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {message.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={handleTestEmail}
            disabled={testing || !senderEmail || !recipientEmail}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <Send size={14} />
            {testing ? "Sending..." : "Test Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
