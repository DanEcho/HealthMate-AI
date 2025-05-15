
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, ImagePlus } from 'lucide-react';
import { useState, useEffect } from 'react';

const formSchema = z.object({
  symptoms: z.string().min(10, { message: 'Please describe your symptoms in at least 10 characters.' }),
  image: z.custom<FileList>().optional(), // For file input
});

export type SymptomFormData = z.infer<typeof formSchema>;

interface SymptomFormProps {
  onSubmit: SubmitHandler<SymptomFormData>;
  isLoading: boolean;
  currentSymptoms?: string; 
}

export function SymptomForm({ onSubmit, isLoading, currentSymptoms }: SymptomFormProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const form = useForm<SymptomFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptoms: currentSymptoms || '',
      image: undefined,
    },
  });

  useEffect(() => {
    // Reset form, including clearing file name if currentSymptoms changes (e.g., new chat)
    form.reset({ symptoms: currentSymptoms || '', image: undefined });
    if (!currentSymptoms) { // If symptoms are cleared (new chat), clear file name
        setFileName(null);
    }
  }, [currentSymptoms, form]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFileName(event.target.files[0].name);
      form.setValue('image', event.target.files);
    } else {
      setFileName(null);
      form.setValue('image', undefined);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-white">HealthAssist AI</CardTitle>
        <CardDescription className="text-center text-lg text-muted-foreground">
          Tell us how you're feeling today. You can also upload an image of your symptom.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="symptoms-input" className="sr-only">Your Symptoms</FormLabel>
                  <FormControl>
                    <Textarea
                      id="symptoms-input"
                      placeholder="For example: I have a headache, fever, and a sore throat..."
                      className="min-h-[150px] text-base p-4 rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                      {...field}
                      aria-label="Describe your symptoms"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={() => ( 
                <FormItem className="p-6 rounded-xl border bg-card shadow-md"> {/* Reverted to bg-card */}
                  <FormLabel htmlFor="image-upload" className="text-sm font-medium text-card-foreground flex items-center gap-2 cursor-pointer"> {/* Adjusted text color */}
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    Upload an Image (Optional)
                  </FormLabel>
                  <FormControl>
                     <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange} 
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer mt-2"
                      />
                  </FormControl>
                  {fileName && <FormDescription className="mt-2 text-xs text-muted-foreground">Selected file: {fileName}</FormDescription>} {/* Adjusted text color */}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-6 bg-primary hover:bg-primary/90">
              {isLoading ? (
                'Analyzing...'
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" /> Get Insights
                </>
              )}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          This tool does not provide medical advice. Consult with a healthcare professional for any health concerns.
        </p>
      </CardContent>
    </Card>
  );
}
