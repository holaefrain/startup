const MIN_PHOTOS = 3;

export default function PhotosStep({ photos, previewUrls, onPhotoChange }) {
  return (
    <fieldset>
      <legend>Step 5 - Photos</legend>
      <p>Add up to 8 photos for your profile ({MIN_PHOTOS} minimum).</p>

      {photos.map((_, index) => (
        <div key={index}>
          <label htmlFor={`photo_${index + 1}`}>Photo {index + 1}</label>
          <input
            id={`photo_${index + 1}`}
            name={`photo_${index + 1}`}
            type="file"
            accept="image/*"
            onChange={(event) => onPhotoChange(index, event)}
          />
          {previewUrls[index] && (
            <img className="photo-preview" src={previewUrls[index]} alt={`Photo ${index + 1} preview`} />
          )}
        </div>
      ))}
    </fieldset>
  );
}

export { MIN_PHOTOS };
