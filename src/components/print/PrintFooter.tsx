/**
 * @fileoverview Print document footer component
 *
 * Displays clinician signature in white box (right) and QR code (left)
 * on teal background
 */

import { QRCodeSVG } from "qrcode.react";

interface PrintFooterProps {
  /** Approving clinician name */
  clinicianName: string;
  /** Document approval date */
  date: string;
  /** Optional public document URL for QR code */
  documentUrl?: string;
  /** Language for localized labels */
  language: string;
}

const LABELS: Record<string, { signedBy: string; scanQr: string }> = {
  estonian: {
    signedBy: "Kinnitanud",
    scanQr: "Skanni digitaalseks koopiaks",
  },
  russian: {
    signedBy: "Утверждено",
    scanQr: "Сканируйте для цифровой копии",
  },
  english: {
    signedBy: "Signed by",
    scanQr: "Scan for Digital Copy",
  },
};

/**
 * Renders the document footer with teal background
 * QR code on left, signature box on right
 */
export const PrintFooter = ({ clinicianName, date, documentUrl, language }: PrintFooterProps) => {
  const normalizedLang = language?.toLowerCase() || "english";
  const labels = LABELS[normalizedLang] || LABELS.english;

  return (
    <div className="print-footer">
      {/* QR Code on LEFT */}
      {documentUrl && (
        <div className="print-qr-container">
          <QRCodeSVG value={documentUrl} size={64} level="M" includeMargin={false} />
          <p className="print-qr-label">{labels.scanQr}</p>
        </div>
      )}

      {/* Signature box on RIGHT - white card */}
      <div className="print-signature">
        <p className="print-signature-label">{labels.signedBy}</p>
        <p className="print-signature-line">{clinicianName}</p>
        <p className="print-signature-date">{date}</p>
      </div>
    </div>
  );
};
