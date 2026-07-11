import React, { useState } from 'react';
import './screenshotupload.css';
import { supabase } from '@lib/supabaseClient';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// userId: the current user's id (players.id / auth.uid()).
// onUploaded(screenshotRow): called once per successfully uploaded file.
const ScreenshotUpload = ({ userId, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadOne = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Formato no válido. Usá PNG, JPG o WEBP.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('Cada imagen puede pesar hasta 5MB.');
    }
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { cacheControl: '3600' });
    if (uploadError) throw new Error('No se pudo subir la imagen.');

    const { data: publicUrlData } = supabase.storage.from('screenshots').getPublicUrl(path);
    const { data: row, error: insertError } = await supabase
      .from('player_screenshots')
      .insert({ player_id: userId, storage_path: path, image_url: publicUrlData.publicUrl })
      .select()
      .single();
    if (insertError) throw new Error('No se pudo guardar la imagen.');
    return row;
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of files) {
      try {
        const row = await uploadOne(file);
        onUploaded(row);
      } catch (err) {
        setError(err.message);
      }
    }
    setUploading(false);
  };

  return (
    <div className="screenshot-upload">
      <label className="btn-blanco screenshot-upload-label">
        {uploading ? 'Subiendo...' : '+ Agregar screenshot'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          hidden
        />
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
};

export default ScreenshotUpload;
