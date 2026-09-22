import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Sparkles, Type } from 'lucide-react';
import { SENTENCE_PROMPTS } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEvaluateSentence } from '@/features/practice/usePractice';

export default function SentencePage() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const evaluate = useEvaluateSentence();
  const prompt = SENTENCE_PROMPTS[index]!;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    evaluate.mutate({ prompt: prompt.prompt, answer: answer.trim() });
  }

  function nextPrompt() {
    setIndex((i) => (i + 1) % SENTENCE_PROMPTS.length);
    setAnswer('');
    evaluate.reset();
  }

  const result = evaluate.data?.evaluation;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <Type className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sentence practice</h1>
          <p className="text-sm text-muted-foreground">
            Answer the prompt in one sentence and get instant feedback.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{prompt.prompt}</CardTitle>
          {prompt.hint && <p className="text-sm text-muted-foreground">Hint: {prompt.hint}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your sentence…"
              rows={3}
              disabled={evaluate.isPending}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="gradient" disabled={evaluate.isPending || !answer.trim()}>
                {evaluate.isPending ? 'Checking…' : 'Check my sentence'}
              </Button>
              <Button type="button" variant="outline" onClick={nextPrompt}>
                Next prompt <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-fade-in">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Feedback
            </CardTitle>
            {result.isCorrect ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" /> Great job
              </Badge>
            ) : (
              <Badge variant="muted">Room to improve</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Corrected</p>
              <p>{result.corrected}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">More natural</p>
              <p className="font-medium text-success">{result.betterVersion}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Why</p>
              <p className="text-muted-foreground">{result.explanation}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: 'Grammar', value: result.grammar_score },
                { label: 'Naturalness', value: result.naturalness_score },
                { label: 'Overall', value: result.overall_score },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium tabular-nums">{s.value}</span>
                  </div>
                  <Progress value={s.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
