import { useState } from "react";
import { Button, Empty, Input, Modal, Slider, Upload } from "antd";
import {
  DeleteOutlined,
  ScissorOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined
} from "@ant-design/icons";
import Cropper from "react-easy-crop";

const { Dragger } = Upload;

export default function ProductImageUploader({
  images,
  onUpload,
  onRemove,
  onSetPrimary,
  onAltChange,
  onCrop,
  uploading
}) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const originalMedia = images.filter((image) => image.mediaType === "original");
  const showcaseMedia = images.filter((image) => image.mediaType !== "original");

  const openCropModal = (index) => {
    setTargetIndex(index);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropModalOpen(true);
  };

  const handleCropConfirm = async () => {
    if (targetIndex == null || !croppedAreaPixels || !onCrop) {
      return;
    }

    await onCrop(targetIndex, croppedAreaPixels);
    setCropModalOpen(false);
    setTargetIndex(null);
  };

  return (
    <>
      <div className="product-image-uploader">
        <div className="image-upload-dropzone">
          <Dragger
            customRequest={onUpload}
            showUploadList={false}
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            openFileDialogOnClick={!uploading}
          >
            <div className={`image-upload-trigger${uploading ? " is-uploading" : ""}`}>
              <div className="image-upload-trigger-icon">
                <UploadOutlined />
              </div>
              <div className="image-upload-copy">
                <span className="image-upload-title">Upload Product Media</span>
                <p>Drag and drop raw or edited media here, or click to browse</p>
                <span className="image-upload-meta">
                  JPG, PNG or WEBP | Max 10MB per image | Recommended size: 2000x2000px
                </span>
              </div>
            </div>
          </Dragger>
        </div>

        {images.length ? (
          <>
            <div className="uploaded-images-head">
              <strong>Media Library</strong>
              <span>({images.length}/10)</span>
            </div>
            <div className="catalog-inline-tip">
              <span>
                Original Media: {originalMedia.length} | Showcase Media: {showcaseMedia.length}
              </span>
            </div>
            <div className="uploaded-product-grid">
              {images.map((image, index) => (
                <div className="uploaded-product-tile" key={image.id || image.url || index}>
                  <button
                    type="button"
                    className={`uploaded-primary-pill${image.isPrimary ? " is-active" : ""}`}
                    onClick={() => onSetPrimary(index)}
                  >
                    {image.isPrimary ? <StarFilled /> : <StarOutlined />}
                    {image.isPrimary ? "Primary" : "Set Primary"}
                  </button>
                  <button
                    type="button"
                    className="uploaded-remove-button"
                    onClick={() => onRemove(index)}
                  >
                    <DeleteOutlined />
                  </button>
                  <img src={image.url} alt={image.alt || "Product image"} />
                  <div className="catalog-image-type-chip">
                    {image.mediaType === "original" ? "Original Media" : "Showcase Media"}
                  </div>
                  <div className="uploaded-image-actions">
                    <Button size="small" icon={<ScissorOutlined />} onClick={() => openCropModal(index)}>
                      Crop
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onAltChange(
                          index,
                          image.alt,
                          image.mediaType === "original" ? "showcase" : "original"
                        )
                      }
                    >
                      {image.mediaType === "original" ? "Move to Showcase" : "Move to Original"}
                    </Button>
                  </div>
                  <Input
                    size="small"
                    value={image.alt}
                    placeholder="Product image label"
                    onChange={(event) => onAltChange(index, event.target.value, image.mediaType)}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="uploaded-product-empty">
            <Empty description="No product media uploaded yet." />
          </div>
        )}
      </div>

      <Modal
        open={cropModalOpen}
        title="Crop Product Image"
        onCancel={() => setCropModalOpen(false)}
        onOk={handleCropConfirm}
        okText="Apply Crop"
        width={720}
        destroyOnHidden
      >
        {targetIndex != null ? (
          <div className="cropper-modal-shell">
            <div className="cropper-stage">
              <Cropper
                image={images[targetIndex]?.url}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>
            <div className="cropper-controls">
              <span>Zoom</span>
              <Slider min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
