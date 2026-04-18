import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Upload, X, AlertCircle, Check, FileText, Image as ImageIcon, File, Loader2, BookOpen, PlusCircle, Layers, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChapters } from '../contexts/ChaptersContext';
import type { WorkSummary, BatchPublishProgress, ContentRating } from '../types';
import { validateCoverImage, validateChapterImage, validatePdfOrCbz } from '../lib/fileValidation';

interface PublishChapterProps {
  onBack: () => void;
  onPublishComplete: () => void;
  preSelectedWork?: string | null;
}

type PublishMode = 'choose' | 'new-work' | 'add-chapter';
type Step = 0 | 1 | 2 | 3 | 4;

export default function PublishChapter({ onBack, onPublishComplete, preSelectedWork }: PublishChapterProps) {
  const { publishChapter, publishBatch, getAllWorks, chapters: allChapters } = useChapters();
  const allWorks = useMemo(() => getAllWorks(), [getAllWorks]);

  // Mode & step
  const [mode, setMode] = useState<PublishMode>(preSelectedWork ? 'add-chapter' : 'choose');
  const [currentStep, setCurrentStep] = useState<Step>(preSelectedWork ? 2 : 0);
  const [selectedWork, setSelectedWork] = useState<WorkSummary | null>(null);
  const [metadataLocked, setMetadataLocked] = useState(false);

  const [contentType, setContentType] = useState<'text' | 'images' | 'file'>('text');
  const [contentRating, setContentRating] = useState<ContentRating>('all');

  // Step 1 - Chapter Info
  const [workTitle, setWorkTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string>('');

  // Step 2 - Content
  const [textContent, setTextContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [chapterFile, setChapterFile] = useState<File | null>(null);

  // Batch mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchPublishProgress | null>(null);

  // Step 3 - Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Step 4 - Publishing
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Upload validation errors (shown inline near the input)
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Select an existing work and pre-fill metadata
  const selectExistingWork = (work: WorkSummary) => {
    setSelectedWork(work);
    setMode('add-chapter');
    setWorkTitle(work.workTitle);
    setDescription(work.description);
    setTags(work.tags);
    setChapterNumber(String(work.latestChapterNumber + 1));
    if (work.coverImage) {
      setCoverImage(work.coverImage);
      setExistingCoverUrl(work.coverImage);
    }
    setMetadataLocked(true);
    setCurrentStep(2);
  };

  // Auto-select work if preSelectedWork is provided
  useEffect(() => {
    if (preSelectedWork && allWorks.length > 0) {
      const found = allWorks.find(
        w => w.workTitle.toLowerCase() === preSelectedWork.toLowerCase()
      );
      if (found) {
        selectExistingWork(found);
      }
    }
  }, []); // only on mount

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

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await validateCoverImage(file);
    if (!result.ok) { setUploadError(result.error!); e.target.value = ''; return; }
    setCoverImageFile(file);
    setExistingCoverUrl('');
    const reader = new FileReader();
    reader.onloadend = () => setCoverImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadError(null);
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const errors: string[] = [];
    const validFiles: File[] = [];
    for (const file of sorted) {
      const result = await validateChapterImage(file);
      if (!result.ok) errors.push(result.error!);
      else validFiles.push(file);
    }
    if (errors.length > 0) setUploadError(errors.join(' '));
    setImageFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await validatePdfOrCbz(file);
    if (!result.ok) { setUploadError(result.error!); e.target.value = ''; return; }
    setChapterFile(file);
    setFileName(file.name);
    setFileType(file.type);
    setFileData(file.name);
  };

  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadError(null);
    const sorted = Array.from(files)
      .filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.cbz'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const errors: string[] = [];
    const validFiles: File[] = [];
    for (const file of sorted) {
      const result = await validatePdfOrCbz(file);
      if (!result.ok) errors.push(result.error!);
      else validFiles.push(file);
    }
    if (errors.length > 0) setUploadError(errors.join(' '));
    const combined = [...batchFiles, ...validFiles].slice(0, 20);
    setBatchFiles(combined);
    e.target.value = '';
  };

  const removeBatchFile = (index: number) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateChapter = () => {
    setIsValidating(true);
    const errors: string[] = [];

    if (!workTitle.trim()) errors.push('Work title is required');
    if (!chapterNumber.trim()) errors.push('Chapter number is required');

    // Duplicate chapter check
    if (isBatchMode) {
      if (batchFiles.length === 0) errors.push('Please select at least one file for batch upload');
      if (duplicateBatchChapters.length > 0) {
        errors.push(`Chapter(s) ${duplicateBatchChapters.join(', ')} of "${workTitle}" already exist. Change the starting chapter number to avoid duplicates.`);
      }
    } else {
      if (duplicateChapter) {
        errors.push(`Chapter ${chapterNumber} of "${workTitle}" already exists (by ${duplicateChapter.author}). Choose a different chapter number.`);
      }
      if (contentType === 'text' && !textContent.trim()) errors.push('Text content cannot be empty');
      if (contentType === 'images' && imageFiles.length === 0) errors.push('Please upload at least one image');
      if (contentType === 'file' && !fileData) errors.push('Please upload a file');
    }

    setTimeout(() => {
      setValidationErrors(errors);
      setIsValidating(false);
      if (errors.length === 0) {
        setCurrentStep(4);
      }
    }, 500);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);

    try {
      if (isBatchMode && batchFiles.length > 0) {
        const startNum = parseInt(chapterNumber);
        const batchInput = batchFiles.map((file, index) => ({
          file,
          chapterNumber: startNum + index,
        }));

        const result = await publishBatch(
          batchInput,
          {
            workTitle,
            description,
            tags,
            status: 'new',
            coverImageFile: coverImageFile || undefined,
            existingCoverUrl: existingCoverUrl || undefined,
            contentType: 'file',
            contentRating,
          },
          (progress) => setBatchProgress(progress)
        );

        if (result.error) {
          setPublishError(result.error);
          setIsPublishing(false);
        } else {
          setIsPublishing(false);
          setPublishSuccess(true);
          setTimeout(() => onPublishComplete(), 2000);
        }
      } else {
        // Single chapter publish
        let actualContentType = contentType;
        if (contentType === 'file' && fileName) {
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') actualContentType = 'pdf' as any;
          else if (ext === 'cbz') actualContentType = 'cbz' as any;
        }

        const result = await publishChapter({
          title: workTitle,
          chapterNumber: parseInt(chapterNumber),
          tags,
          status: 'new',
          description,
          contentType: actualContentType,
          contentRating,
          textContent: contentType === 'text' ? textContent : undefined,
          coverImageFile: coverImageFile || undefined,
          existingCoverUrl: existingCoverUrl || undefined,
          imageFiles: contentType === 'images' ? imageFiles : undefined,
          chapterFile: contentType === 'file' ? chapterFile || undefined : undefined,
          fileName: contentType === 'file' ? fileName : undefined,
          fileType: contentType === 'file' ? fileType : undefined,
        });

        if (result.error) {
          setPublishError(result.error);
          setIsPublishing(false);
        } else {
          setIsPublishing(false);
          setPublishSuccess(true);
          setTimeout(() => onPublishComplete(), 2000);
        }
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish chapter');
      setIsPublishing(false);
    }
  };

  // Check if typed title matches an existing work on the platform
  const matchingWork = useMemo(() => {
    if (!workTitle.trim() || mode !== 'new-work') return null;
    return allWorks.find(w => w.workTitle.toLowerCase().trim() === workTitle.toLowerCase().trim()) || null;
  }, [workTitle, allWorks, mode]);

  // Check if this exact chapter number already exists for this work title
  const duplicateChapter = useMemo(() => {
    if (!workTitle.trim() || !chapterNumber.trim()) return null;
    const chapNum = parseInt(chapterNumber);
    if (isNaN(chapNum)) return null;
    return allChapters.find(
      ch => ch.title.toLowerCase().trim() === workTitle.toLowerCase().trim() && ch.chapterNumber === chapNum
    ) || null;
  }, [workTitle, chapterNumber, allChapters]);

  // For batch mode: check which chapter numbers in the batch already exist
  const duplicateBatchChapters = useMemo(() => {
    if (!isBatchMode || !workTitle.trim() || !chapterNumber.trim() || batchFiles.length === 0) return [];
    const startNum = parseInt(chapterNumber);
    if (isNaN(startNum)) return [];
    const dupes: number[] = [];
    for (let i = 0; i < batchFiles.length; i++) {
      const chapNum = startNum + i;
      const exists = allChapters.find(
        ch => ch.title.toLowerCase().trim() === workTitle.toLowerCase().trim() && ch.chapterNumber === chapNum
      );
      if (exists) dupes.push(chapNum);
    }
    return dupes;
  }, [isBatchMode, workTitle, chapterNumber, batchFiles, allChapters]);

  const hasDuplicates = isBatchMode ? duplicateBatchChapters.length > 0 : !!duplicateChapter;

  const canProceedToStep2 = workTitle.trim() && chapterNumber.trim() && description.trim();
  const canProceedToStep3 = isBatchMode
    ? batchFiles.length > 0
    : (contentType === 'text' ? textContent.trim() : (contentType === 'images' ? imageFiles.length > 0 : fileData));

  // Step label for header
  const getStepLabel = () => {
    if (currentStep === 0) return 'Choose Mode';
    if (mode === 'add-chapter' && metadataLocked) {
      // Compressed flow: step 2=1, 3=2, 4=3
      return `Step ${currentStep - 1} of 3`;
    }
    return `Step ${currentStep} of 4`;
  };

  // Progress bar steps
  const totalSteps = (mode === 'add-chapter' && metadataLocked) ? 3 : 4;
  const currentProgress = currentStep === 0 ? 0 : (mode === 'add-chapter' && metadataLocked) ? currentStep - 1 : currentStep;

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={currentStep === 0 ? onBack : () => {
                if (currentStep === 2 && mode === 'add-chapter' && metadataLocked) {
                  setCurrentStep(0);
                  setMode('choose');
                  setMetadataLocked(false);
                  setSelectedWork(null);
                } else if (currentStep === 1) {
                  setCurrentStep(0);
                } else if (currentStep > 1) {
                  setCurrentStep((currentStep - 1) as Step);
                } else {
                  onBack();
                }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Publish Chapter</h1>
              <p className="text-white/80 text-xs">{getStepLabel()}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        {currentStep > 0 && (
          <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    step <= currentProgress ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {/* STEP 0 - Mode Chooser */}
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-xl p-5 shadow-lg border border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">What would you like to do?</h2>

                  <div className="space-y-3">
                    {/* New Work */}
                    <button
                      onClick={() => {
                        setMode('new-work');
                        setMetadataLocked(false);
                        setCurrentStep(1);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-xl transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <PlusCircle className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">New Work</h3>
                        <p className="text-sm text-muted-foreground">Start a brand new story or manga</p>
                      </div>
                    </button>

                    {/* Add Chapter to Existing Work (all works on the platform) */}
                    {allWorks.length > 0 && (
                      <>
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-border"></div>
                          <span className="text-xs text-muted-foreground font-medium">OR</span>
                          <div className="flex-1 h-px bg-border"></div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-400" />
                            Add Chapter to Existing Work
                          </h3>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {allWorks.map((work) => (
                              <button
                                key={work.workTitle}
                                onClick={() => selectExistingWork(work)}
                                className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-accent border border-border hover:border-blue-500/50 rounded-xl transition-all text-left"
                              >
                                {/* Cover Thumbnail */}
                                {work.coverImage ? (
                                  <img
                                    src={work.coverImage}
                                    alt={work.workTitle}
                                    className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-5 h-5 text-purple-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-foreground text-sm truncate">{work.workTitle}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    by {work.author} · {work.chapterCount} ch · Latest: Ch. {work.latestChapterNumber}
                                  </p>
                                  {work.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {work.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                                    + Ch. {work.latestChapterNumber + 1}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 1 - Chapter Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-xl p-4 shadow-lg border border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">Chapter Information</h2>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Work Title *
                      </label>
                      <input
                        type="text"
                        value={workTitle}
                        onChange={(e) => setWorkTitle(e.target.value)}
                        placeholder="e.g., Chronicles of the Code"
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />

                      {/* Matching work detected */}
                      {matchingWork && (
                        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-xs text-blue-400 font-medium mb-2">
                            A work called "{matchingWork.workTitle}" already exists (by {matchingWork.author}, {matchingWork.chapterCount} ch)
                          </p>
                          <button
                            onClick={() => selectExistingWork(matchingWork)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Add Chapter {matchingWork.latestChapterNumber + 1} to this work instead
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Chapter Number *
                      </label>
                      <input
                        type="number"
                        value={chapterNumber}
                        onChange={(e) => setChapterNumber(e.target.value)}
                        placeholder="e.g., 1"
                        min="1"
                        className={`w-full px-3 py-2.5 bg-secondary border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
                          duplicateChapter ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-purple-500'
                        }`}
                      />

                      {/* Duplicate chapter warning */}
                      {duplicateChapter && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-red-400 font-medium">
                            Chapter {chapterNumber} of "{workTitle}" already exists (by {duplicateChapter.author}). Please choose a different chapter number.
                          </p>
                          {matchingWork && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Next available: Ch. {matchingWork.latestChapterNumber + 1}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Description *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of this chapter..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Tags
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Add tags (e.g., #fantasy)"
                          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddTag}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-md text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content Rating */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <ShieldAlert className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
                        Classification du contenu
                      </label>
                      <div className="flex gap-2">
                        {([
                          { value: 'all' as const, label: 'Tout public', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
                          { value: '16+' as const, label: '16+', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
                          { value: '18+' as const, label: '18+', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
                        ]).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setContentRating(opt.value)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                              contentRating === opt.value
                                ? opt.color
                                : 'bg-secondary text-muted-foreground border-border hover:bg-accent'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {contentRating !== 'all' && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Ce contenu sera {contentRating === '18+' ? 'masqué ou flouté' : 'signalé'} pour les utilisateurs qui filtrent le contenu mature.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
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
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                        >
                          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">Click to upload cover image</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                        </label>
                      ) : (
                        <div className="relative group">
                          <img
                            src={coverImage}
                            alt="Cover preview"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setCoverImage('');
                              setCoverImageFile(null);
                              setExistingCoverUrl('');
                            }}
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
                      {uploadError && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-400">{uploadError}</p>
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
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
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
                {/* Pre-filled metadata summary (add-chapter mode) */}
                {mode === 'add-chapter' && metadataLocked && selectedWork && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        Adding to: {workTitle}
                      </h3>
                      <button
                        onClick={() => {
                          setMetadataLocked(false);
                          setCurrentStep(1);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 hover:bg-blue-500/10 rounded transition-all"
                      >
                        Edit Info
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chapter #{chapterNumber} · {tags.length} tags · {coverImage ? 'Has cover' : 'No cover'}
                    </p>
                    {duplicateChapter && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-xs text-red-400 font-medium">
                          Ch. {chapterNumber} already exists! Use "Edit Info" to change the chapter number.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-card rounded-xl p-4 shadow-lg border border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">Upload Content</h2>

                  {/* Content Type Selector */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => { setContentType('text'); setIsBatchMode(false); }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'text' && !isBatchMode
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-secondary text-muted-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Text Chapter
                    </button>
                    <button
                      onClick={() => { setContentType('images'); setIsBatchMode(false); }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'images' && !isBatchMode
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-secondary text-muted-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Images/Manga
                    </button>
                    <button
                      onClick={() => { setContentType('file'); setIsBatchMode(false); }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        contentType === 'file' && !isBatchMode
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-secondary text-muted-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      <File className="w-4 h-4" />
                      File Upload
                    </button>
                    <button
                      onClick={() => { setContentType('file'); setIsBatchMode(true); }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                        isBatchMode
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'bg-secondary text-muted-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Batch Upload
                    </button>
                  </div>

                  {/* Upload validation error */}
                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{uploadError}</p>
                      <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-300 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Text Input */}
                  {contentType === 'text' && !isBatchMode && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Chapter Content
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Write your chapter content here..."
                        rows={12}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {textContent.length} characters
                      </p>
                    </div>
                  )}

                  {/* Folder Upload */}
                  {contentType === 'images' && !isBatchMode && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Upload Folder
                      </label>

                      <input
                        type="file"
                        // @ts-ignore
                        webkitdirectory=""
                        directory=""
                        mozdirectory=""
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />

                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Click to select a folder</p>
                        <p className="text-xs text-muted-foreground">All images in the folder will be uploaded</p>
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

                  {/* Single File Upload */}
                  {contentType === 'file' && !isBatchMode && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Upload File
                      </label>

                      <input
                        type="file"
                        accept=".pdf,.cbz"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />

                      {!fileData ? (
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                        >
                          <File className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">Click to upload file</p>
                          <p className="text-xs text-muted-foreground">PDF or CBZ up to 50MB</p>
                        </label>
                      ) : (
                        <div className="relative group">
                          <div className="w-full h-40 object-cover rounded-lg bg-secondary border border-border flex flex-col items-center justify-center text-muted-foreground">
                            <File className="w-8 h-8 mb-2" />
                            <p className="text-sm font-medium">{fileName}</p>
                          </div>
                          <button
                            onClick={() => { setFileData(''); setChapterFile(null); setFileName(''); setFileType(''); }}
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

                  {/* Batch File Upload */}
                  {isBatchMode && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Select Multiple Files (max 20)
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Each file becomes a separate chapter, starting from Ch. {chapterNumber || '?'}
                      </p>

                      <input
                        type="file"
                        accept=".pdf,.cbz"
                        multiple
                        onChange={handleBatchFileUpload}
                        className="hidden"
                        id="batch-file-upload"
                      />

                      <label
                        htmlFor="batch-file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-all"
                      >
                        <Layers className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Click to select PDF/CBZ files</p>
                        <p className="text-xs text-muted-foreground">{batchFiles.length}/20 files selected</p>
                      </label>

                      {batchFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {batchFiles.map((file, index) => {
                            const chapNum = parseInt(chapterNumber || '1') + index;
                            const isDupe = duplicateBatchChapters.includes(chapNum);
                            return (
                              <div key={index} className={`flex items-center gap-3 p-3 bg-secondary rounded-lg border ${isDupe ? 'border-red-500/50' : 'border-border'}`}>
                                <span className={`text-xs font-bold px-2 py-1 rounded min-w-[55px] text-center ${isDupe ? 'text-red-400 bg-red-500/20' : 'text-purple-400 bg-purple-500/20'}`}>
                                  Ch. {chapNum}{isDupe ? ' !' : ''}
                                </span>
                                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {(file.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                                <button
                                  onClick={() => removeBatchFile(index)}
                                  className="p-1 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
                                >
                                  <X className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (mode === 'add-chapter' && metadataLocked) {
                        setCurrentStep(0);
                        setMode('choose');
                        setMetadataLocked(false);
                        setSelectedWork(null);
                      } else {
                        setCurrentStep(1);
                      }
                    }}
                    className="flex-1 py-3 bg-card hover:bg-accent text-foreground border border-border rounded-xl font-medium text-sm transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedToStep3}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      canProceedToStep3
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md'
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
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
                <div className="bg-card rounded-xl p-4 shadow-lg border border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">Validation</h2>

                  {!isValidating && validationErrors.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Click validate to check your chapter for errors
                      </p>
                      <button
                        onClick={validateChapter}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        Validate {isBatchMode ? `${batchFiles.length} Chapters` : 'Chapter'}
                      </button>
                    </div>
                  )}

                  {isValidating && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                      <p className="text-muted-foreground text-sm">Validating...</p>
                    </div>
                  )}

                  {!isValidating && validationErrors.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Validation Errors</span>
                      </div>
                      {validationErrors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3 bg-card hover:bg-accent text-foreground border border-border rounded-xl font-medium text-sm transition-all"
                  >
                    Back
                  </button>
                  {validationErrors.length > 0 && (
                    <button
                      onClick={validateChapter}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-sm transition-all"
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
                <div className="bg-card rounded-xl p-4 shadow-lg border border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">Ready to Publish</h2>

                  {!isPublishing && !publishSuccess && !publishError && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-foreground font-semibold mb-2">All checks passed!</h3>
                      <p className="text-muted-foreground text-sm mb-6">
                        {isBatchMode
                          ? `${batchFiles.length} chapters ready to be published`
                          : 'Your chapter is ready to be published'
                        }
                      </p>

                      <div className="bg-secondary rounded-lg p-4 mb-6 text-left border border-border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Title:</span>
                            <span className="font-medium text-foreground">{workTitle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Chapter{isBatchMode ? 's' : ''}:</span>
                            <span className="font-medium text-foreground">
                              {isBatchMode
                                ? `#${chapterNumber} - #${parseInt(chapterNumber) + batchFiles.length - 1} (${batchFiles.length} files)`
                                : `#${chapterNumber}`
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium text-foreground capitalize">
                              {isBatchMode ? 'Batch (PDF/CBZ)' : contentType}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tags:</span>
                            <span className="font-medium text-foreground">{tags.length}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handlePublish}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium text-sm shadow-md transition-all"
                      >
                        {isBatchMode ? `Publish ${batchFiles.length} Chapters` : 'Publish Chapter'}
                      </button>
                    </div>
                  )}

                  {isPublishing && !isBatchMode && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                      <p className="text-muted-foreground text-sm">Publishing your chapter...</p>
                    </div>
                  )}

                  {isPublishing && isBatchMode && batchProgress && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                      <p className="text-foreground font-semibold mb-2">
                        Publishing Chapter {batchProgress.currentChapterNumber}...
                      </p>
                      <div className="w-full max-w-xs mx-auto bg-secondary rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(batchProgress.completedChapters / batchProgress.totalChapters) * 100}%` }}
                        />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {batchProgress.completedChapters} / {batchProgress.totalChapters} chapters
                      </p>
                    </div>
                  )}

                  {publishError && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-foreground font-semibold mb-2">Publishing Failed</h3>
                      <p className="text-red-400 text-sm mb-4">{publishError}</p>
                      <button
                        onClick={handlePublish}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        Try Again
                      </button>
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
                      <h3 className="text-foreground font-bold text-lg mb-2">Published Successfully!</h3>
                      <p className="text-muted-foreground text-sm">
                        {isBatchMode
                          ? `${batchFiles.length} chapters are now live!`
                          : 'Your chapter is now live and visible to readers'
                        }
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
