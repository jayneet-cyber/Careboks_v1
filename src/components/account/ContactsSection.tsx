/**
 * @fileoverview Clinician Contacts Section
 * 
 * Manages the user's directory of clinician contacts. These contacts
 * can be included in patient communication documents. Features:
 * - CRUD operations for contacts
 * - Primary contact designation
 * - Maximum of 5 contacts per user
 * 
 * @module components/account/ContactsSection
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Phone, Mail, Star } from "lucide-react";
import { useAppLanguage } from "@/lib/i18n";

/** Maximum number of contacts allowed per user */
const MAX_CONTACTS = 5;

/**
 * Contact data structure
 */
interface Contact {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_primary: boolean;
}

/**
 * Clinician contacts management component
 * 
 * Provides interface for managing clinician contact directory
 * with add, edit, and delete functionality.
 * 
 * @example
 * ```tsx
 * <ContactsSection />
 * ```
 */
const ContactsSection = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();
  const { t } = useAppLanguage();

  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    phone: "",
    email: "",
    notes: "",
    is_primary: false
  });

  useEffect(() => {
    loadContacts();
  }, []);

  /**
   * Fetches contacts from database for current user
   */
  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clinician_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: t("Error"),
        description: t("Failed to load contacts"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens the contact form dialog
   * @param contact - Existing contact to edit, or undefined for new contact
   */
  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        specialty: contact.specialty || "",
        phone: contact.phone || "",
        email: contact.email || "",
        notes: contact.notes || "",
        is_primary: contact.is_primary
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: "",
        specialty: "",
        phone: "",
        email: "",
        notes: "",
        is_primary: false
      });
    }
    setDialogOpen(true);
  };

  /**
   * Saves contact to database (create or update)
   */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t("Validation error"),
        description: t("Name is required"),
        variant: "destructive"
      });
      return;
    }

    if (contacts.length >= MAX_CONTACTS && !editingContact) {
      toast({
        title: t("Limit reached"),
        description: t("You can only have up to {max} contacts", { max: MAX_CONTACTS }),
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingContact) {
        const { error } = await supabase
          .from('clinician_contacts')
          .update({
            name: formData.name,
            specialty: formData.specialty || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null,
            is_primary: formData.is_primary
          })
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinician_contacts')
          .insert({
            user_id: user.id,
            name: formData.name,
            specialty: formData.specialty || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null,
            is_primary: formData.is_primary
          });

        if (error) throw error;
      }

      toast({
        title: t("Success"),
        description: editingContact ? t("Contact updated") : t("Contact added")
      });

      setDialogOpen(false);
      loadContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast({
        title: t("Error"),
        description: t("Failed to save contact"),
        variant: "destructive"
      });
    }
  };

  /**
   * Deletes a contact from the database
   * @param id - Contact ID to delete
   */
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clinician_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t("Success"),
        description: t("Contact deleted")
      });

      loadContacts();
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: t("Error"),
        description: t("Failed to delete contact"),
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clinician Contacts</CardTitle>
            <CardDescription>
              {t("Manage your trusted clinician references (max {max})", { max: MAX_CONTACTS })}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={contacts.length >= MAX_CONTACTS}
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4" />
                {t("Add Contact")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? t("Edit Contact") : t("Add New Contact")}
                </DialogTitle>
                <DialogDescription>
                  {t("Enter the clinician's information")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("Name *")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">{t("Specialty")}</Label>
                  <Input
                    id="specialty"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Cardiologist"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("Phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+372 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("Email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.ee"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("Notes")}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("Additional information...")}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_primary"
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_primary: !!checked })}
                  />
                  <Label htmlFor="is_primary" className="text-sm font-normal">
                    {t("Mark as primary contact")}
                  </Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("Cancel")}
                  </Button>
                  <Button onClick={handleSave}>
                    {editingContact ? t("Update") : t("Add")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("No contacts added yet")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{contact.name}</h3>
                      {contact.is_primary && (
                        <Star className="h-4 w-4 text-warning fill-warning" />
                      )}
                    </div>
                    {contact.specialty && (
                      <p className="text-sm text-muted-foreground">{contact.specialty}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{contact.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactsSection;
