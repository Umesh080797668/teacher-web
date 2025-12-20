'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { teachersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Teacher } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userType, isAuthenticated, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);

  const teacher = user as Teacher;

  useEffect(() => {
    if (!isAuthenticated || userType !== 'teacher') {
      router.push('/login');
      return;
    }
    
    // Fetch complete teacher data including timestamps
    if (teacher?._id) {
      loadTeacherProfile();
    }
  }, [isAuthenticated, userType, router, teacher]);

  const loadTeacherProfile = async () => {
    if (!teacher?._id) return;

    try {
      const response = await teachersApi.getById(teacher._id);
      setTeacherData(response.data);
      
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
      });
      
      // @ts-ignore - profilePicture might exist in teacher object
      if (response.data.profilePicture) {
        // @ts-ignore
        setProfileImage(response.data.profilePicture);
      }
    } catch (error) {
      console.error('Error loading teacher profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setShowImageOptions(false);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setImageFile(null);
    setShowImageOptions(false);
  };

  const handleSave = async () => {
    if (!teacher?._id) return;

    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
      };

      // Handle profile picture if there's a new image file
      if (imageFile) {
        // Convert image to base64 for API
        const reader = new FileReader();
        reader.onloadend = async () => {
          updateData.profilePicture = reader.result as string;
          
          const response = await teachersApi.update(teacher._id, updateData);
          updateUser(response.data);
          setTeacherData(response.data);
          toast.success('Profile updated successfully');
          setIsEditing(false);
          setImageFile(null);
          setIsLoading(false);
        };
        reader.readAsDataURL(imageFile);
      } else {
        // Update without image change
        if (profileImage) {
          updateData.profilePicture = profileImage;
        }
        const response = await teachersApi.update(teacher._id, updateData);
        updateUser(response.data);
        setTeacherData(response.data);
        toast.success('Profile updated successfully');
        setIsEditing(false);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (teacherData) {
      setFormData({
        name: teacherData.name || '',
        email: teacherData.email || '',
        phone: teacherData.phone || '',
      });
      // @ts-ignore
      setProfileImage(teacherData.profilePicture || null);
      setImageFile(null);
    } else if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
      });
      // @ts-ignore
      setProfileImage(teacher.profilePicture || null);
      setImageFile(null);
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-12 text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg overflow-hidden mx-auto mb-4">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-indigo-600">
                      {teacherData?.name?.charAt(0)?.toUpperCase() || teacher?.name?.charAt(0)?.toUpperCase() || 'T'}
                    </span>
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="absolute bottom-4 right-1/2 translate-x-[calc(50%+2rem)] bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              {showImageOptions && (
                <div className="absolute bottom-0 right-1/2 translate-x-[calc(50%+2rem)] translate-y-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10 min-w-[180px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center text-sm text-gray-700"
                  >
                    <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choose Photo
                  </button>
                  {profileImage && (
                    <>
                      <div className="border-t border-gray-200"></div>
                      <button
                        onClick={handleRemoveImage}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center text-sm text-red-600"
                      >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Photo
                      </button>
                    </>
                  )}
                  <div className="border-t border-gray-200"></div>
                  <button
                    onClick={() => setShowImageOptions(false)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center text-sm text-gray-700"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{teacher?.name || 'Teacher'}</h2>
            <p className="text-indigo-100">{teacher?.teacherId}</p>
          </div>

          {/* Profile Information */}
          <div className="p-6 space-y-6">
            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name {isEditing && <span className="text-red-500">*</span>}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{teacherData?.name || teacher?.name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email {isEditing && <span className="text-red-500">*</span>}
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{teacherData?.email || teacher?.email || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{teacherData?.phone || teacher?.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher ID</label>
                  <p className="text-gray-900 py-2 font-mono bg-gray-50 px-3 rounded-lg">{teacherData?.teacherId || teacher?.teacherId || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    teacherData?.status === 'active' || teacher?.status === 'active'
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {teacherData?.status || teacher?.status || 'active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Account Created</p>
                  <p className="text-gray-900 font-medium">
                    {teacherData?.createdAt 
                      ? new Date(teacherData.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                  <p className="text-gray-900 font-medium">
                    {teacherData?.updatedAt 
                      ? new Date(teacherData.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
