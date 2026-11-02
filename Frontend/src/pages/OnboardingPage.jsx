import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import RiskProfileSummary from "../components/RiskProfileSummary";
import { Logo } from "../components/AppLayout";
import { primaryButtonClassName } from "../components/AuthShell";

const OnboardingPage = () => {
  const { user, signOut, fetchQuestionnaire, saveInvestorProfile } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [questions, setQuestions] = useState([]);
  const [loadError, setLoadError] = useState(null);
  // Prefilled when retaking the questionnaire from Settings
  const [answers, setAnswers] = useState(user?.investorProfile?.answers || {});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await fetchQuestionnaire();
      setQuestions(data.questions);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [fetchQuestionnaire]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const question = questions[step];
  const isLastStep = step === questions.length - 1;

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (!isLastStep) setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      await saveInvestorProfile(answers);
      setIsComplete(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4">
        <Logo />
        <button
          onClick={handleSignOut}
          className="text-muted hover:text-ink text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl">
          {isComplete ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <RiskProfileSummary profile={user.investorProfile} />
              <Link
                to="/home"
                className={`${primaryButtonClassName} mt-8`}
              >
                Go to my home page
              </Link>
            </motion.div>
          ) : loadError ? (
            <div role="alert">
              <p className="text-loss mb-4">{loadError}</p>
              <button
                onClick={loadQuestions}
                className="text-accent underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : !question ? (
            <p className="text-muted">Loading your questions...</p>
          ) : (
            <>
              <div className="mb-10">
                <div className="flex items-center justify-between text-sm text-muted mb-2">
                  <span>{question.section}</span>
                  <span>
                    Question {step + 1} of {questions.length}
                  </span>
                </div>
                <div className="h-1 bg-wash rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={false}
                    animate={{
                      width: `${((step + 1) / questions.length) * 100}%`,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={question.id}
                  initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                >
                  <h1 className="font-display text-3xl md:text-4xl leading-tight mb-8">
                    {question.prompt}
                  </h1>

                  <div className="space-y-3">
                    {question.options.map((option) => {
                      const isSelected = answers[question.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleAnswer(option.value)}
                          aria-pressed={isSelected}
                          className={`w-full text-left px-5 py-4 rounded-lg border transition-colors ${
                            isSelected
                              ? "border-accent bg-accent-soft text-ink"
                              : "border-line bg-surface text-ink hover:border-line-strong"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {submitError && (
                <p role="alert" className="text-loss text-sm mt-6">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={step === 0}
                  className="text-muted hover:text-ink disabled:invisible transition-colors"
                >
                  Back
                </button>

                {isLastStep ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!answers[question.id] || submitting}
                    className={`${primaryButtonClassName} !w-auto`}
                  >
                    {submitting ? "Working it out..." : "See my risk profile"}
                  </button>
                ) : (
                  answers[question.id] && (
                    <button
                      onClick={() => setStep(step + 1)}
                      className="text-accent underline underline-offset-2 transition-colors"
                    >
                      Next
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
