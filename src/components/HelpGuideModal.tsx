import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  ChevronRight,
  ChevronLeft,
  Search,
  Store,
  Clock,
  BookmarkCheck,
  ShieldCheck,
  PackagePlus,
  ClipboardCheck,
  User as UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

type GuideRole = UserRole | 'guest';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: GuideRole;
  userName?: string;
}

interface GuideStep {
  icon: React.ElementType;
  title: string;
  body: string;
}

const PATIENT_STEPS: GuideStep[] = [
  {
    icon: Search,
    title: 'Search for your medicine',
    body: 'Type a brand or generic name (e.g. "Augmentin" or "Amoxicillin") on the search page to see who has it in stock nearby.',
  },
  {
    icon: Store,
    title: 'Compare nearby pharmacies',
    body: 'Results are ranked by distance and live stock. A green "PCG Verified" badge means the pharmacy is accredited.',
  },
  {
    icon: BookmarkCheck,
    title: 'Place a 2-hour hold',
    body: 'Found it? Tap "Reserve" to hold your quantity at that pharmacy for 2 hours — no payment needed to place the hold.',
  },
  {
    icon: Clock,
    title: 'Track your reservation',
    body: 'You\'ll get a short pickup code. Check it anytime under "My Reservations" — it counts down until it expires.',
  },
  {
    icon: ShieldCheck,
    title: 'Collect at the counter',
    body: 'Show your code at the pharmacy within the 2-hour window to pay and collect your medicine.',
  },
];

const PHARMACIST_STEPS: GuideStep[] = [
  {
    icon: Store,
    title: 'This is your dispensary console',
    body: 'Everything here is scoped to your verified pharmacy — patients only ever see what you keep in stock.',
  },
  {
    icon: PackagePlus,
    title: 'Keep your stock current',
    body: 'Use "Stock New Drug" to add medicines and update quantities as they change. Patients search this in real time.',
  },
  {
    icon: Clock,
    title: 'Watch incoming holds',
    body: 'New patient reservations land in your holds queue with a live countdown timer.',
  },
  {
    icon: ClipboardCheck,
    title: 'Confirm & dispense',
    body: 'Confirm a hold when it\'s ready, then mark it dispensed once the patient collects and pays at the counter.',
  },
  {
    icon: ShieldCheck,
    title: 'Stay compliant',
    body: 'Your license and PCG verification status are visible to every patient — keeping this accurate builds trust.',
  },
];

const ADMIN_STEPS: GuideStep[] = [
  {
    icon: ShieldCheck,
    title: 'PCG Inspector console',
    body: 'Review and verify pharmacy accreditation across the whole network from one place.',
  },
  {
    icon: Store,
    title: 'Audit pharmacies',
    body: 'Check licensing details and compliance status, and flag pharmacies that need follow-up.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review activity',
    body: 'Track reservations and dispensing activity system-wide to keep the network accountable.',
  },
];

const GREETING: Record<Exclude<GuideRole, 'guest'>, string> = {
  patient: 'Here\'s a quick walkthrough of how to find and hold emergency medication.',
  pharmacist: 'Here\'s a quick walkthrough of your dispensary console.',
  admin: 'Here\'s a quick walkthrough of the inspector console.',
};

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose, role, userName }) => {
  const [chosenRole, setChosenRole] = useState<Exclude<GuideRole, 'guest'> | null>(
    role !== 'guest' ? role : null
  );
  const [stepIndex, setStepIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the conversation each time the guide is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setChosenRole(role !== 'guest' ? role : null);
      setStepIndex(0);
    }
  }, [isOpen, role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chosenRole, stepIndex]);

  if (!isOpen) return null;

  const steps = chosenRole === 'pharmacist' ? PHARMACIST_STEPS : chosenRole === 'admin' ? ADMIN_STEPS : PATIENT_STEPS;
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStepIndex(i => Math.min(i + 1, steps.length - 1));
    }
  };

  const handleBack = () => setStepIndex(i => Math.max(i - 1, 0));

  const handlePickRole = (picked: Exclude<GuideRole, 'guest'>) => {
    setChosenRole(picked);
    setStepIndex(0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-md max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">PharmaLink Quick Guide</h3>
                <p className="text-[11px] text-slate-500">
                  {chosenRole ? `Step ${stepIndex + 1} of ${steps.length}` : 'A few taps and you\'re set'}
                </p>
              </div>
            </div>
            <button
              id="close-help-guide-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat transcript */}
          <div ref={scrollRef} className="p-5 space-y-3 overflow-y-auto grow">
            {/* Bot greeting */}
            <ChatBubble>
              {userName ? `Hi ${userName.split(' ')[0]}! ` : 'Hi there! '}
              {chosenRole ? GREETING[chosenRole] : 'What brings you to PharmaLink GH today?'}
            </ChatBubble>

            {!chosenRole && (
              <div className="flex flex-wrap gap-2 pl-9">
                <button
                  id="help-guide-role-patient"
                  onClick={() => handlePickRole('patient')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  I need to find medicine
                </button>
                <button
                  id="help-guide-role-pharmacist"
                  onClick={() => handlePickRole('pharmacist')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  I manage a pharmacy
                </button>
              </div>
            )}

            {chosenRole && (
              <AnimatePresence initial={false}>
                {steps.slice(0, stepIndex + 1).map((step, i) => {
                  const StepIcon = step.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ChatBubble>
                        <span className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                          <StepIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {step.title}
                        </span>
                        {step.body}
                      </ChatBubble>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          {chosenRole && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i <= stepIndex ? 'bg-slate-900' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    id="help-guide-back-btn"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}
                <button
                  id="help-guide-next-btn"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  {isLastStep ? 'Got it, thanks!' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ChatBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
      <Bot className="w-3.5 h-3.5" />
    </div>
    <div className="bg-slate-100 rounded-md px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed max-w-[85%]">
      {children}
    </div>
  </div>
);
