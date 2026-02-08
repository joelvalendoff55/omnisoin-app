import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ConsultationReason,
  ConsultationReasonFormData,
  CATEGORY_OPTIONS,
} from '@/lib/consultationReasons';

const formSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Maximum 20 caractères'),
  label: z.string().min(1, 'Le libellé est requis'),
  category: z.enum(['acute', 'chronic', 'prevention', 'administrative', 'other']),
  description: z.string().optional(),
  default_duration: z.number().min(5, 'Minimum 5 minutes').max(120, 'Maximum 120 minutes'),
  color: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ConsultationReasonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: ConsultationReason | null;
  onSubmit: (data: ConsultationReasonFormData) => Promise<void>;
}

export default function ConsultationReasonForm({
  open,
  onOpenChange,
  reason,
  onSubmit,
}: ConsultationReasonFormProps) {
  const isEditing = !!reason;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      label: '',
      category: 'acute',
      description: '',
      default_duration: 15,
      color: '#3B82F6',
      is_active: true,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (reason) {
      form.reset({
        code: reason.code,
        label: reason.label,
        category: reason.category,
        description: reason.description || '',
        default_duration: reason.default_duration,
        color: reason.color || '#3B82F6',
        is_active: reason.is_active,
        sort_order: reason.sort_order,
      });
    } else {
      form.reset({
        code: '',
        label: '',
        category: 'acute',
        description: '',
        default_duration: 15,
        color: '#3B82F6',
        is_active: true,
        sort_order: 0,
      });
    }
  }, [reason, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      code: values.code.toUpperCase(),
      label: values.label,
      category: values.category,
      description: values.description || null,
      default_duration: values.default_duration,
      color: values.color || null,
      is_active: values.is_active,
      sort_order: values.sort_order,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="reason-form">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le motif' : 'Nouveau motif de consultation'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="CONS_GEN" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Code court unique</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée par défaut (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={5} 
                        max={120}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 15)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé *</FormLabel>
                  <FormControl>
                    <Input placeholder="Consultation générale" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: option.color }}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="color" 
                          className="w-12 h-9 p-1 cursor-pointer"
                          {...field}
                        />
                        <Input 
                          placeholder="#3B82F6" 
                          {...field}
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description optionnelle du motif..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d'affichage</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Actif</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Enregistrement...'
                  : isEditing
                  ? 'Modifier'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
