import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const exercisesApi = createApi({
  reducerPath: 'exercisesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Exercise'],
  endpoints: (builder) => ({
    // Get exercises by category and age group
    getExercisesByCategory: builder.query({
      // Backend expects: /exercises/:ageGroup/:category
      query: ({ ageGroup, category }) => `/exercises/${ageGroup}/${category}`,
      providesTags: ['Exercise']
    })
  })
});

export const {
  useGetExercisesByCategoryQuery
} = exercisesApi;
