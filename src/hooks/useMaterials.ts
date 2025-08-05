import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Material {
  id: string;
  sku?: string;
  name?: string;
  unit?: string;
  category?: string;
  unit_cost?: number;
  supplier?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialFormData {
  sku?: string;
  name: string;
  unit?: string;
  category?: string;
  unit_cost?: number;
  supplier?: string;
}

export const useMaterials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch materials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (materialData: MaterialFormData) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert([materialData])
        .select()
        .single();
      
      if (error) throw error;
      
      setMaterials(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Material created successfully",
      });
      return data;
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: "Error",
        description: "Failed to create material",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<MaterialFormData>) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setMaterials(prev => prev.map(material => 
        material.id === id ? data : material
      ));
      toast({
        title: "Success",
        description: "Material updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: "Error",
        description: "Failed to update material",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMaterials(prev => prev.filter(material => material.id !== id));
      toast({
        title: "Success",
        description: "Material deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Error",
        description: "Failed to delete material",
        variant: "destructive",
      });
      throw error;
    }
  };

  const bulkImportMaterials = async (materials: MaterialFormData[]) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert(materials)
        .select();
      
      if (error) throw error;
      
      setMaterials(prev => [...prev, ...data]);
      toast({
        title: "Success",
        description: `${data.length} materials imported successfully`,
      });
      return data;
    } catch (error) {
      console.error('Error importing materials:', error);
      toast({
        title: "Error",
        description: "Failed to import materials",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  return {
    materials,
    loading,
    fetchMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    bulkImportMaterials,
  };
};