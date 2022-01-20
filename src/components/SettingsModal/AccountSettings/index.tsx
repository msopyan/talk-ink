import React, { Dispatch, SetStateAction, useMemo, useState } from "react";

import { useFormik } from "formik";
import { BiErrorCircle } from "react-icons/bi";
import { RiAccountCircleFill } from "react-icons/ri";
import { kontenbase } from "lib/client";

import Button from "components/Button/Button";
import TextInput from "components/Form/TextInput";
import Upload from "components/Form/Upload";
import ChangePassword from "./ChangePassword";

import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import { useToast } from "hooks/useToast";

import { SettingsModalRouteState } from "types";
import { updateUser } from "features/auth";

import { MAX_IMAGE_SIZE, SUPPORTED_IMAGE_TYPE } from "utils/constants";
import { beforeUploadImage, getBase64, resizeFile } from "utils/helper";
import { updateAccount } from "utils/validators";

type TypeInitialValues = {
  firstName: string;
  avatar?: File | null | undefined;
};

type TProps = {
  currentRoute: SettingsModalRouteState;
  setCurrentRoute: Dispatch<SetStateAction<SettingsModalRouteState>>;
};

function AccountSettings({ currentRoute, setCurrentRoute }: TProps) {
  const [showToast] = useToast();

  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const [profilePreview, setProfilePreview] = useState(null);

  const userData = useMemo(() => {
    return auth.user;
  }, [auth.user]);

  const showChangePassword = useMemo(() => {
    return currentRoute.current === "changePassword";
  }, [currentRoute]);

  const initialValues: TypeInitialValues = {
    firstName: userData.firstName,
  };

  const uploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file: File = e.target.files[0];
    const check = beforeUploadImage({
      file,
      types: SUPPORTED_IMAGE_TYPE,
      maxSize: MAX_IMAGE_SIZE,
    });
    if (check.error) {
      return formik.setFieldError("avatar", check.message);
    }
    if (!check.error) {
      formik.setFieldValue("avatar", e.target.files[0]);
      getBase64(e.target.files[0], (result) => {
        setProfilePreview(result);
        dispatch(updateUser({ avatar: result }));
      });

      try {
        const resized = await resizeFile(file, 500);
        const { data: uploadImage, error: uploadError } =
          await kontenbase.storage.upload(resized);
        if (uploadError) throw new Error(uploadError?.message);

        const { error } = await kontenbase.auth.update({
          avatar: [uploadImage],
        });
        if (error) throw new Error(error?.message);
      } catch (error) {
        console.log("err", error);
        showToast({ message: `${JSON.stringify(error)}` });
      }
    }
  };

  const removePhotoHandler = async () => {
    try {
      const { error } = await kontenbase.auth.update({
        avatar: null,
      });
      if (error) throw new Error(error?.message);

      dispatch(updateUser({ avatar: null }));
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${JSON.stringify(error)}` });
    }
  };

  const onSubmit = async (values: { firstName: string }) => {
    try {
      const { error } = await kontenbase.auth.update({
        firstName: values.firstName,
      });
      if (error) throw new Error(error?.message);

      dispatch(updateUser({ firstName: values.firstName }));
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${JSON.stringify(error)}` });
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: updateAccount,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  return (
    <div className="min-h-[50vh] overflow-auto">
      {currentRoute.current === currentRoute.route && (
        <form onSubmit={formik.handleSubmit}>
          <div className="border-b border-neutral-100 pb-5">
            <p className="text-sm font-semibold">Photo</p>
            <div className="my-5">
              <div className="flex items-end ">
                <div className="h-24 w-24 rounded-full flex items-center justify-center overflow-hidden">
                  {!profilePreview && !userData.avatar && (
                    <RiAccountCircleFill
                      size={96}
                      className="text-neutral-200"
                    />
                  )}
                  {(profilePreview || userData?.avatar) && (
                    <img
                      src={profilePreview || userData?.avatar}
                      alt="logo"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="ml-5 ">
                  <div className="flex gap-2 items-center">
                    <Upload
                      onChange={uploadFile}
                      className="h-8 py-0 flex items-center justify-center"
                    >
                      <span className="text-sm font-semibold">
                        Upload photo
                      </span>
                    </Upload>
                    {(profilePreview || userData.avatar) && (
                      <Button
                        className="border border-red-400 text-sm text-red-500 font-semibold hover:border-red-700 hover:text-red-700"
                        onClick={removePhotoHandler}
                      >
                        Remove photo
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 my-3">
                    Pick an image up to 4MB
                  </p>
                </div>
              </div>
              {formik.errors.avatar && (
                <div className="flex gap-2 items-center mt-2">
                  <BiErrorCircle size={20} className="text-red-700" />
                  <p className="text-sm -mb-1">{formik.errors.avatar}</p>
                </div>
              )}
            </div>
            <p className="text-sm font-semibold mb-1">Name</p>
            <div className="flex flex-col mb-5">
              <TextInput
                className="max-w-sm"
                defaultValue={userData.firstName}
                onBlur={formik.handleBlur("firstName")}
                onChange={formik.handleChange("firstName")}
                value={formik.values.firstName}
              />
            </div>
            <p className="text-sm font-semibold mb-1">Primary email</p>
            <div className="flex flex-col">
              <p className="text-sm">{userData.email}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold mt-5 mb-2">Login</h3>
            <p className="text-sm text-neutral-500">
              Choose to log in to Talk.ink via email and password.
            </p>
            <div>
              <h4 className="text-sm font-bold mt-5 mb-2">
                Email and password
              </h4>
              <p className="text-sm text-neutral-500">
                You can log in with{" "}
                <span className="font-semibold">{userData.email}</span> and your
                password.
              </p>
              {/* <Button
                className=" text-sm font-semibold bg-neutral-200 hover:bg-neutral-300 mt-3"
                onClick={() => {
                  setCurrentRoute((prev) => ({
                    ...prev,
                    current: "changePassword",
                  }));
                }}
              >
                Change password
              </Button> */}
            </div>
          </div>

          {formik.values.firstName !== userData.firstName && (
            <div className="w-full h-14 mt-10 flex items-center  justify-end p-1">
              <div className="flex items-center justify-end gap-2">
                <Button
                  className="text-sm flex items-center justify-center hover:bg-neutral-50 min-w-[5rem]"
                  onClick={() => {
                    formik.setFieldValue("firstName", userData.firstName);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="text-sm flex items-center justify-center bg-indigo-500 min-w-[5rem] text-white"
                  type="submit"
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
      {showChangePassword && (
        <ChangePassword
          onCancel={() =>
            setCurrentRoute((prev) => ({ ...prev, current: prev.route }))
          }
        />
      )}
    </div>
  );
}

export default AccountSettings;
