import React, { useState } from 'react';
import './campaignimageupload.css';
import { supabase } from '@lib/supabaseClient';
import { FaCloudUploadAlt, FaSpinner } from 'react-icons/fa';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Admin-only uploader for a campaign badge or a mission cover. Writes into
// the 'campaigns' bucket, whose RLS gates every write on private.is_admin().
//
// Unlike the avatar/screenshot uploaders, this does NOT write the resulting
// URL to a row: the campaign or mission may not exist yet when the admin
// picks an image (create form). It hands { url, path } back to the parent
// form, which persists both alongside the rest of the record on save.
//
// folder: 'campaign' | 'mission' - the bucket prefix, purely for tidiness.
// currentUrl: existing image to preview, or null.
// onUploaded({ url, path }): called after a successful upload.
const CampaignImageUpload = ({ folder, currentUrl, onUploaded, label = 'Subir imagen' }) => {
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
    // A random path per upload rather than a stable one keyed on the record
    // id: the record may not have an id yet on the create form, and a unique
    // name sidesteps CDN caching of a replaced image.
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('campaigns')
      .upload(path, file, { cacheControl: '3600' });
    if (uploadError) {
      setUploading(false);
      setError('No se pudo subir la imagen.');
      return;
    }

    const { data } = supabase.storage.from('campaigns').getPublicUrl(path);
    setUploading(false);
    onUploaded({ url: data.publicUrl, path });
  };

  return (
    <div className="campaign-image-upload">
      {currentUrl && <img src={currentUrl} alt="" className="campaign-image-preview" />}
      <label className={`btn-blanco campaign-image-label${uploading ? ' uploading' : ''}`}>
        {uploading ? (
          <><FaSpinner className="campaign-image-spinner" /> Subiendo...</>
        ) : (
          <><FaCloudUploadAlt /> {currentUrl ? 'Cambiar imagen' : label}</>
        )}
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

export default CampaignImageUpload;
