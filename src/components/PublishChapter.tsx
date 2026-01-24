import React, { useState } from 'react';
import { ArrowLeft, Upload, X, AlertCircle, Check, FileText, Image as ImageIcon, Plus, File } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublishChapterProps {
  onBack: () => void;
  onPublishComplete: () => void;
  onPublish: (chapter: {
    title: string;
    chapterNumber: number;
    tags: string[];
    status: 'new' | 'ongoing' | 'completed';
    description: string;
    contentType: 'text' | 'images' | 'file';
    textContent?: string;
    images?: string[];
    coverImage?: string;
    fileData?: string;
    fileName?: string;
    fileType?: string;
  }) => void;
}

type Step = 1 | 2 | 3 | 4;

export default function PublishChapter({ onBack, onPublishComplete, onPublish }: PublishChapterProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [contentType, setContentType] = useState<'text' | 'images' | 'file'>('text');
  
  // Step 1 - Chapter Info
  const [workTitle, setWorkTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');

  // Step 2 - Content
  const [textContent, setTextContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');

  // Step 3 - Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Step 4 - Publishing
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const formattedTag = tagInput.trim().startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`;
      setTags([...tags, formattedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
        setFileName(file.name);
        setFileType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateChapter = () => {
    setIsValidating(true);
    const errors: string[] = [];

    // Check if chapter already exists
    if (chapterNumber === '1') {
      errors.push('A chapter with this number already exists for this work');
    }

    // Check required fields
    if (!workTitle.trim()) errors.push('Work title is required');
    if (!chapterNumber.trim()) errors.push('Chapter number is required');
    if (contentType === 'text' && !textContent.trim()) {
      errors.push('Text content cannot be empty');
    }
    if (contentType === 'images' && uploadedImages.length === 0) {
      errors.push('Please upload at least one image');
    }
    if (contentType === 'file' && !fileData) {
      errors.push('Please upload a file');
    }

    setTimeout(() => {
      setValidationErrors(errors);
      setIsValidating(false);
      
      if (errors.length === 0) {
        setCurrentStep(4);
      }
    }, 1000);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    
    // Simulate publishing
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      
      // Call onPublish with the chapter data
      onPublish({
        title: workTitle,
        chapterNumber: parseInt(chapterNumber),
        tags,
        status: 'new',
        description,
        contentType,
        textContent: contentType === 'text' ? textContent : undefined,
        images: contentType === 'images' ? uploadedImages : undefined,
        coverImage,
        fileData: contentType === 'file' ? fileData : undefined,
        fileName: contentType === 'file' ? fileName : undefined,
        fileType: contentType === 'file' ? fileType : undefined,
      });
      
      setTimeout(() => {
        onPublishComplete();
      }, 2000);
    }, 1500);
  };

  const canProceedToStep2 = workTitle.trim() && chapterNumber.trim() && description.trim();
  const canProceedToStep3 = contentType === 'text' ? textContent.trim() : uploadedImages.length > 0 || fileData;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Publish Chapter</h1>
              <p className="text-white/80 text-xs">Step {currentStep} of 4</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  step <= currentStep ? 'bg-white' : 'bg-white/20'
                }`} 
              />
            ))}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1 - Chapter Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Chapter Information</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Work Title *
                      </label>
                      <input
                        type="text"
                        value={workTitle}
                        onChange={(e) => setWorkTitle(e.target.value)}
                        placeholder="e.g., Chronicles of the Code"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Chapter Number *
                      </label>
                      <input
                        type="number"
                        value={chapterNumber}
                        onChange={(e) => setChapterNumber(e.target.value)}
                        placeholder="e.g., 1"
                        min="1"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of this chapter..."
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tags
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Add tags (e.g., #fantasy)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddTag}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Cover Image (Optional)
                      </label>
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                        id="cover-image-upload"
                      />
                      
                      {!coverImage ? (
                        <label
                          htmlFor="cover-image-upload"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 font-medium">Click to upload cover image</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        </label>
                      ) : (
                        <div className="relative group">
                          <img
                            src={coverImage}
                            alt="Cover preview"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => setCoverImage('')}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <label
                            htmlFor="cover-image-upload"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg"
                          >
                            <span className="text-white text-sm font-medium">Change Image</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className={`w-full py-3 rounded-xl font-medium text-sm shadow-md transition-all ${
                    canProceedToStep2
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Content Upload
                </button>
              </motion.div>
            )}

            {/* STEP 2 - Content Upload */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Content</h2>

                  {/* Content Type Selector */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setContentType('text')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'text'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Text Chapter
                    </button>
                    <button
                      onClick={() => setContentType('images')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'images'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Images/Manga
                    </button>
                    <button
                      onClick={() => setContentType('file')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'file'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <File className="w-4 h-4" />
                      File Upload
                    </button>
                  </div>

                  {/* Text Input */}
                  {contentType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Chapter Content
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Write your chapter content here..."
                        rows={12}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {textContent.length} characters
                      </p>
                    </div>
                  )}

                  {/* Folder Upload */}
                  {contentType === 'images' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Upload Folder
                      </label>
                      
                      <input
                        type="file"
                        // @ts-ignore - webkitdirectory is not in standard types
                        webkitdirectory=""
                        directory=""
                        mozdirectory=""
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Click to select a folder</p>
                        <p className="text-xs text-gray-500">All images in the folder will be uploaded</p>
                      </label>

                      {uploadedImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Page ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                                Page {index + 1}
                              </div>
                              <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Upload */}
                  {contentType === 'file' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Upload File
                      </label>
                      
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      
                      {!fileData ? (
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <File className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 font-medium">Click to upload file</p>
                          <p className="text-xs text-gray-500">PDF, DOCX, TXT up to 10MB</p>
                        </label>
                      ) : (
                        <div className="relative group">
                          <div
                            className="w-full h-40 object-cover rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
                          >
                            <File className="w-8 h-8" />
                          </div>
                          <button
                            onClick={() => setFileData('')}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <label
                            htmlFor="file-upload"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg"
                          >
                            <span className="text-white text-sm font-medium">Change File</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium text-sm transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedToStep3}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      canProceedToStep3
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Continue to Validation
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 - Validation */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Validation</h2>

                  {!isValidating && validationErrors.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Click validate to check your chapter for errors
                      </p>
                      <button
                        onClick={validateChapter}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        Validate Chapter
                      </button>
                    </div>
                  )}

                  {isValidating && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                        <AlertCircle className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="text-gray-600 text-sm">Validating chapter...</p>
                    </div>
                  )}

                  {!isValidating && validationErrors.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Validation Errors</span>
                      </div>
                      {validationErrors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium text-sm transition-all"
                  >
                    Back
                  </button>
                  {validationErrors.length > 0 && (
                    <button
                      onClick={validateChapter}
                      className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-all"
                    >
                      Retry Validation
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4 - Publish */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Ready to Publish</h2>

                  {!isPublishing && !publishSuccess && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-gray-900 font-semibold mb-2">All checks passed!</h3>
                      <p className="text-gray-600 text-sm mb-6">
                        Your chapter is ready to be published
                      </p>

                      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Title:</span>
                            <span className="font-medium text-gray-900">{workTitle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chapter:</span>
                            <span className="font-medium text-gray-900">#{chapterNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium text-gray-900 capitalize">{contentType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tags:</span>
                            <span className="font-medium text-gray-900">{tags.length}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handlePublish}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium text-sm shadow-md transition-all"
                      >
                        Publish Chapter
                      </button>
                    </div>
                  )}

                  {isPublishing && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="text-gray-600 text-sm">Publishing your chapter...</p>
                    </div>
                  )}

                  {publishSuccess && (
                    <div className="text-center py-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-8 h-8 text-white" strokeWidth={3} />
                      </motion.div>
                      <h3 className="text-gray-900 font-bold text-lg mb-2">Published Successfully!</h3>
                      <p className="text-gray-600 text-sm">
                        Your chapter is now live and visible to readers
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}