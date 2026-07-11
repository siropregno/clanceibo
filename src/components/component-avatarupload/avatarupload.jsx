import React, { useState } from 'react';
import './avatarupload.css';
import { supabase } from '@lib/supabaseClient';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// userId: the current user's id (players.id / auth.uid()).
// currentUrl: the player's current avatar_url, or null.
// onUploaded(url): called with the new public avatar_url after a successful upload.
const AvatarUploader = ({ userId, currentUrl, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no válido. Usá PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('La imagen no puede superar los 2MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (uploadError) {
      setUploading(false);
      setError('No se pudo subir la imagen.');
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase
      .from('players')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);
    setUploading(false);
    if (updateError) { setError('No se pudo guardar la imagen.'); return; }
    onUploaded(publicUrl);
  };

  return (
    <div className="avatar-uploader">
      <PlayerAvatar url={currentUrl} size={72} />
      <label className="btn-blanco avatar-uploader-label">
        {uploading ? 'Subiendo...' : 'Cambiar foto'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          hidden
        />
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
};

export default AvatarUploader;
