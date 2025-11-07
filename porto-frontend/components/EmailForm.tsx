import { useState } from 'react';
import { sendChatMessage } from '../services/apiService';
import { EmailIcon } from './icons';

interface EmailFormProps {
  onDraftGenerated?: (draft: { subject: string; message: string }) => void;
  onSend?: () => void;
  onToast?: (message: string, type?: 'success' | 'error') => void;
  threadId?: string | null;
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): boolean => {
  if (!email.trim()) return false;
  return emailRegex.test(email.trim());
};

const validateMultipleEmails = (emails: string): boolean => {
  if (!emails.trim()) return true; // Empty is valid (optional field)
  const emailList = emails.split(',').map(email => email.trim()).filter(email => email.length > 0);
  if (emailList.length === 0) return true; // Only commas/whitespace is valid (empty)
  return emailList.every(email => validateEmail(email));
};

const EmailForm = ({ onDraftGenerated, onSend, onToast, threadId }: EmailFormProps) => {
  const [formData, setFormData] = useState({
    sender_email: '',
    recipient_email: '',
    keywords: '',
    cc: '',
    bcc: '',
  });
  
  const [styleOptions, setStyleOptions] = useState({
    formality: 'neutral' as 'formal' | 'informal' | 'neutral',
    length: 'medium' as 'short' | 'medium' | 'long',
    greeting: 'standard' as 'formal' | 'informal' | 'standard' | 'none',
  });
  
  const [draft, setDraft] = useState<{ subject: string; message: string } | null>(null);
  const [editableDraft, setEditableDraft] = useState<{ subject: string; message: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [messageViewMode, setMessageViewMode] = useState<'edit' | 'preview'>('edit');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldValue = formData[field as keyof typeof formData];
    if (typeof fieldValue === 'string') {
      validateField(field, fieldValue);
    }
  };

  const validateField = (field: string, value: string) => {
    const newErrors: Record<string, string> = { ...errors };
    
    switch (field) {
      case 'sender_email':
        if (!value.trim()) {
          newErrors[field] = 'Absender-E-Mail ist erforderlich';
        } else if (!validateEmail(value)) {
          newErrors[field] = 'Ungültige E-Mail-Adresse';
        } else {
          delete newErrors[field];
        }
        break;
      case 'recipient_email':
        if (!value.trim()) {
          newErrors[field] = 'Empfänger-E-Mail ist erforderlich';
        } else if (!validateEmail(value)) {
          newErrors[field] = 'Ungültige E-Mail-Adresse';
        } else {
          delete newErrors[field];
        }
        break;
      case 'keywords':
        if (!value.trim()) {
          newErrors[field] = 'Stichworte sind erforderlich';
        } else {
          delete newErrors[field];
        }
        break;
      case 'cc':
        if (value && !validateMultipleEmails(value)) {
          newErrors[field] = 'Ungültige E-Mail-Adresse(n). Trenne mehrere Adressen mit Komma.';
        } else {
          delete newErrors[field];
        }
        break;
      case 'bcc':
        if (value && !validateMultipleEmails(value)) {
          newErrors[field] = 'Ungültige E-Mail-Adresse(n). Trenne mehrere Adressen mit Komma.';
        } else {
          delete newErrors[field];
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    const fieldsToValidate = ['sender_email', 'recipient_email', 'keywords'] as const;
    let isValid = true;
    
    fieldsToValidate.forEach(field => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });
    
    // Validate optional fields if they have values
    if (formData.cc && !validateField('cc', formData.cc)) isValid = false;
    if (formData.bcc && !validateField('bcc', formData.bcc)) isValid = false;
    
    return isValid;
  };

  const handleGenerateDraft = async () => {
    // Mark all required fields as touched
    setTouched({
      sender_email: true,
      recipient_email: true,
      keywords: true,
    });
    
    if (!validateForm()) {
      onToast?.('Bitte korrigiere die Fehler im Formular', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const keywords = formData.keywords;
      
      // Build style instructions
      const styleInstructions = [];
      if (styleOptions.formality !== 'neutral') {
        styleInstructions.push(`Stil: ${styleOptions.formality === 'formal' ? 'formell und professionell' : 'informell und freundlich'}`);
      }
      if (styleOptions.length !== 'medium') {
        styleInstructions.push(`Länge: ${styleOptions.length === 'short' ? 'kurz und prägnant' : 'ausführlich und detailliert'}`);
      }
      if (styleOptions.greeting !== 'standard') {
        const greetingMap = {
          'formal': 'formelle Anrede (z.B. "Sehr geehrte/r")',
          'informal': 'informelle Anrede (z.B. "Hallo" oder "Liebe/r")',
          'none': 'keine Anrede'
        };
        styleInstructions.push(`Anredeform: ${greetingMap[styleOptions.greeting]}`);
      }
      
      const styleText = styleInstructions.length > 0 
        ? `\n\nStil-Anforderungen:\n${styleInstructions.map(s => `- ${s}`).join('\n')}`
        : '';
      
      // Sanitize inputs to prevent prompt injection
      const sanitizeInput = (input: string): string => {
        return input.replace(/[\n\r]/g, ' ').trim();
      };
      
      const prompt = `Bitte generiere einen professionellen E-Mail-Entwurf mit folgenden Informationen:
- Absender: ${sanitizeInput(formData.sender_email)}
- Empfänger: ${sanitizeInput(formData.recipient_email)}
- Stichworte/Thema: ${sanitizeInput(keywords)}
${formData.cc ? `- CC: ${sanitizeInput(formData.cc)}` : ''}
${formData.bcc ? `- BCC: ${sanitizeInput(formData.bcc)}` : ''}${styleText}

Generiere basierend auf den Stichworten und den Stil-Anforderungen einen passenden Betreff und E-Mail-Inhalt. WICHTIG: Die E-Mail-Nachricht muss als reiner Text formatiert werden (KEIN HTML, KEINE HTML-Tags). Verwende normale Zeilenumbrüche für Absätze. Formatiere die Antwort so:
Betreff: [hier der generierte Betreff]

Nachricht:
[hier der generierte E-Mail-Inhalt als reiner Text]`;

      const response = await sendChatMessage(prompt, threadId, false);
      
      // Parse the response to extract subject and message
      const answer = response.answer;
      
      // Try to extract subject and message from the response
      const subjectMatch = answer.match(/Betreff[:\s]+(.+?)(?:\n\n|\nNachricht|$)/is) || 
                         answer.match(/Subject[:\s]+(.+?)(?:\n\n|\nMessage|$)/is);
      const subject = subjectMatch ? subjectMatch[1].trim() : 'No subject';
      
      // Extract message (everything after "Nachricht:" or "Message:")
      const messageMatch = answer.match(/Nachricht[:\s]+\n(.+)/is) || 
                          answer.match(/Message[:\s]+\n(.+)/is) ||
                          answer.match(/Inhalt[:\s]+\n(.+)/is);
      let message = messageMatch ? messageMatch[1].trim() : answer;
      
      // If no explicit message section found, try to get everything after subject
      if (!messageMatch && subjectMatch) {
        const afterSubject = answer.substring(answer.indexOf(subjectMatch[0]) + subjectMatch[0].length).trim();
        message = afterSubject || answer;
      }

      const generatedDraft = { subject, message };
      setDraft(generatedDraft);
      setEditableDraft({ subject, message }); // Set editable copy
      if (onDraftGenerated) {
        onDraftGenerated(generatedDraft);
      }
      onToast?.('E-Mail-Entwurf erfolgreich generiert!', 'success');
    } catch (error) {
      console.error('Error generating draft:', error);
      onToast?.(
        `Fehler beim Generieren des Entwurfs: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftChange = (field: 'subject' | 'message', value: string) => {
    if (editableDraft) {
      setEditableDraft(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSend = async () => {
    if (!editableDraft || !formData.sender_email || !formData.recipient_email) {
      onToast?.('Bitte generiere zuerst einen E-Mail-Entwurf', 'error');
      return;
    }

    if (!editableDraft.subject.trim() || !editableDraft.message.trim()) {
      onToast?.('Betreff und Nachricht dürfen nicht leer sein', 'error');
      return;
    }

    setIsSending(true);
    try {
      // Sanitize inputs to prevent prompt injection
      const sanitizeInput = (input: string): string => {
        return input.replace(/[\n\r]/g, ' ').trim();
      };
      
      const prompt = `Sende eine E-Mail mit folgenden Details:
- Absender: ${sanitizeInput(formData.sender_email)}
- Empfänger: ${sanitizeInput(formData.recipient_email)}
- Betreff: ${sanitizeInput(editableDraft.subject)}
- Nachricht: ${sanitizeInput(editableDraft.message)}
${formData.cc ? `- CC: ${sanitizeInput(formData.cc)}` : ''}
${formData.bcc ? `- BCC: ${sanitizeInput(formData.bcc)}` : ''}`;

      await sendChatMessage(prompt, threadId, false);
      
      onToast?.('E-Mail erfolgreich gesendet!', 'success');
      
      if (onSend) {
        onSend();
      }
      
      // Reset form after sending
      setFormData({
        sender_email: '',
        recipient_email: '',
        keywords: '',
        cc: '',
        bcc: '',
      });
      setStyleOptions({
        formality: 'neutral',
        length: 'medium',
        greeting: 'standard',
      });
      setDraft(null);
      setEditableDraft(null);
      setErrors({});
      setTouched({});
      setShowOptionalFields(false);
    } catch (error) {
      console.error('Error sending email:', error);
      onToast?.(
        `Fehler beim Senden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        'error'
      );
    } finally {
      setIsSending(false);
    }
  };

  const getFieldStatus = (field: string) => {
    if (!touched[field]) return 'default';
    if (errors[field]) return 'error';
    if (formData[field as keyof typeof formData]) return 'success';
    return 'default';
  };

  const getInputClasses = (field: string) => {
    const baseClasses = "w-full bg-gray-700/90 text-white rounded-xl px-5 py-3.5 text-base transition-all duration-200 focus:outline-none placeholder:text-gray-500";
    const status = getFieldStatus(field);
    
    switch (status) {
      case 'error':
        return `${baseClasses} border-2 border-red-500/70 focus:border-red-500 shadow-lg shadow-red-500/10`;
      case 'success':
        return `${baseClasses} border-2 border-green-500/50 focus:border-teal-500 shadow-lg shadow-green-500/10`;
      default:
        return `${baseClasses} border-2 border-gray-600/60 focus:border-teal-500 hover:border-gray-500/80`;
    }
  };

  const isFormValid = () => {
    return formData.sender_email && 
           formData.recipient_email && 
           formData.keywords &&
           !errors.sender_email &&
           !errors.recipient_email &&
           !errors.keywords;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border-2 border-teal-500/50 rounded-2xl p-6 md:p-8 shadow-2xl animate-slide-up">
      <div className="mb-7">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-teal-500/20 to-teal-600/20 rounded-xl shadow-lg">
            <EmailIcon className="w-7 h-7" color="text-teal-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">E-Mail senden</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Fülle das Formular aus und generiere einen Entwurf</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Absender */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-700/50 rounded-lg">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span>Absender-E-Mail</span>
            <span className="text-red-400 font-bold">*</span>
          </label>
          <input
            type="email"
            value={formData.sender_email}
            onChange={(e) => handleInputChange('sender_email', e.target.value)}
            onBlur={() => handleBlur('sender_email')}
            placeholder="deine@email.de"
            className={getInputClasses('sender_email')}
          />
          {touched.sender_email && errors.sender_email && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.sender_email}</span>
            </p>
          )}
          {touched.sender_email && !errors.sender_email && formData.sender_email && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Gültige E-Mail-Adresse</span>
            </p>
          )}
        </div>

        {/* Empfänger */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-700/50 rounded-lg">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span>Empfänger-E-Mail</span>
            <span className="text-red-400 font-bold">*</span>
          </label>
          <input
            type="email"
            value={formData.recipient_email}
            onChange={(e) => handleInputChange('recipient_email', e.target.value)}
            onBlur={() => handleBlur('recipient_email')}
            placeholder="empfaenger@email.de"
            className={getInputClasses('recipient_email')}
          />
          {touched.recipient_email && errors.recipient_email && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.recipient_email}</span>
            </p>
          )}
          {touched.recipient_email && !errors.recipient_email && formData.recipient_email && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Gültige E-Mail-Adresse</span>
            </p>
          )}
        </div>

        {/* Stichworte */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-700/50 rounded-lg">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <span>Stichworte/Thema</span>
            <span className="text-red-400 font-bold">*</span>
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => handleInputChange('keywords', e.target.value)}
            onBlur={() => handleBlur('keywords')}
            placeholder="z.B. Bewerbung als Software Engineer, Terminabsage, Projektanfrage"
            className={getInputClasses('keywords')}
          />
          {touched.keywords && errors.keywords && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.keywords}</span>
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2 flex items-start gap-2 bg-gray-700/30 px-3 py-2 rounded-lg border border-gray-600/30">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Der Agent generiert basierend auf diesen Stichworten automatisch Betreff und Inhalt der E-Mail</span>
          </p>
        </div>

        {/* Style Options Toggle */}
        <button
          type="button"
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700/70 rounded-xl transition-all duration-200 group border-2 border-gray-600/50 hover:border-gray-500/70 shadow-md hover:shadow-lg"
        >
          <span className="text-sm font-semibold text-gray-200 flex items-center gap-3">
            <div className="p-1.5 bg-gray-600/50 rounded-lg group-hover:bg-gray-600/70 transition-colors">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span>Stil-Optionen & Erweiterte Einstellungen</span>
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showOptionalFields ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Style Options */}
        {showOptionalFields && (
          <div className="space-y-5 pl-4 border-l-2 border-teal-500/30 bg-gray-800/30 p-5 rounded-xl animate-slide-up">
            {/* Formality */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Formell/Informell
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['formal', 'neutral', 'informal'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStyleOptions(prev => ({ ...prev, formality: option }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                      styleOptions.formality === option
                        ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20 scale-105'
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80 border-gray-600/50 hover:border-gray-500/70'
                    }`}
                  >
                    {option === 'formal' ? 'Formell' : option === 'informal' ? 'Informell' : 'Neutral'}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Länge
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['short', 'medium', 'long'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStyleOptions(prev => ({ ...prev, length: option }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                      styleOptions.length === option
                        ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20 scale-105'
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80 border-gray-600/50 hover:border-gray-500/70'
                    }`}
                  >
                    {option === 'short' ? 'Kurz' : option === 'long' ? 'Lang' : 'Mittel'}
                  </button>
                ))}
              </div>
            </div>

            {/* Greeting */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Anredeform
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['formal', 'standard', 'informal', 'none'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStyleOptions(prev => ({ ...prev, greeting: option }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                      styleOptions.greeting === option
                        ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20 scale-105'
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80 border-gray-600/50 hover:border-gray-500/70'
                    }`}
                  >
                    {option === 'formal' ? 'Formell' : option === 'informal' ? 'Informell' : option === 'none' ? 'Keine' : 'Standard'}
                  </button>
                ))}
              </div>
            </div>

            {/* CC/BCC (still available but less prominent) */}
            <div className="pt-3 border-t border-gray-700/50">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  CC (optional)
                  <span className="text-xs text-gray-500 ml-2">Mehrere Adressen mit Komma trennen</span>
                </label>
                <input
                  type="text"
                  value={formData.cc}
                  onChange={(e) => handleInputChange('cc', e.target.value)}
                  onBlur={() => handleBlur('cc')}
                  placeholder="cc1@email.com, cc2@email.com"
                  className={getInputClasses('cc')}
                />
                {touched.cc && errors.cc && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.cc}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  BCC (optional)
                  <span className="text-xs text-gray-500 ml-2">Mehrere Adressen mit Komma trennen</span>
                </label>
                <input
                  type="text"
                  value={formData.bcc}
                  onChange={(e) => handleInputChange('bcc', e.target.value)}
                  onBlur={() => handleBlur('bcc')}
                  placeholder="bcc1@email.com, bcc2@email.com"
                  className={getInputClasses('bcc')}
                />
                {touched.bcc && errors.bcc && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.bcc}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateDraft}
          disabled={isGenerating || !isFormValid()}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 text-base border-2 border-teal-500/30 hover:border-teal-400/50"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generiere Entwurf...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Entwurf generieren</span>
            </>
          )}
        </button>

        {editableDraft && (
          <div className="mt-7 p-6 md:p-7 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-teal-500/60 rounded-2xl shadow-2xl animate-slide-up backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-700/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500/30 to-teal-600/30 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-teal-300">E-Mail-Entwurf</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Bearbeite den Entwurf vor dem Versenden</p>
                </div>
              </div>
              <span className="text-xs text-teal-300 bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30 font-semibold">Bearbeitbar</span>
            </div>
            
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2.5">
                <div className="p-1.5 bg-gray-700/50 rounded-lg">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                  </svg>
                </div>
                <span>Betreff</span>
                <span className="text-red-400 font-bold">*</span>
                <span className="text-xs text-gray-500 font-normal ml-auto bg-gray-700/50 px-2.5 py-1 rounded-md">
                  {editableDraft.subject.length} Zeichen
                </span>
              </label>
              <input
                type="text"
                value={editableDraft.subject}
                onChange={(e) => handleDraftChange('subject', e.target.value)}
                className="w-full bg-gray-800/90 border-2 border-gray-700/70 rounded-xl px-5 py-3 text-base text-white focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-600/70 placeholder:text-gray-500"
                placeholder="E-Mail Betreff"
              />
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Nachricht <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {editableDraft.message.length} Zeichen
                  </span>
                  <div className="flex gap-1 bg-gray-700/60 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setMessageViewMode('edit')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                        messageViewMode === 'edit'
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageViewMode('preview')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                        messageViewMode === 'preview'
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Vorschau
                    </button>
                  </div>
                </div>
              </div>
              {messageViewMode === 'edit' ? (
                <textarea
                  value={editableDraft.message}
                  onChange={(e) => handleDraftChange('message', e.target.value)}
                  rows={10}
                  className="w-full bg-gray-800/90 border-2 border-gray-700/70 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-teal-500 resize-y min-h-[200px] font-mono leading-relaxed transition-all duration-200 hover:border-gray-600/70 placeholder:text-gray-500 whitespace-pre-wrap"
                  placeholder="E-Mail-Nachricht"
                />
              ) : (
                <div
                  className="w-full bg-gray-800/90 border-2 border-gray-700/70 rounded-xl px-5 py-4 text-sm text-white min-h-[200px] max-h-[400px] overflow-y-auto hover:border-gray-600/70 transition-colors whitespace-pre-wrap"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    lineHeight: '1.6',
                  }}
                >
                  {editableDraft.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t-2 border-gray-700/60">
              <button
                onClick={() => {
                  setEditableDraft(null);
                  setDraft(null);
                }}
                disabled={isSending}
                className="flex-1 bg-gray-700/80 hover:bg-gray-600/80 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] border-2 border-gray-600/50 hover:border-gray-500/70"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Abbrechen</span>
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !editableDraft.subject.trim() || !editableDraft.message.trim()}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 border-2 border-green-500/30 hover:border-green-400/50"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sende E-Mail...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>E-Mail senden</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailForm;

