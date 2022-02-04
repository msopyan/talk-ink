import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useAppSelector } from "hooks/useAppSelector";
import { getBase64, getNameInitial, resizeFile } from "utils/helper";
import Upload from "components/Form/Upload";
import TextInput from "components/Form/TextInput";
import Button from "components/Button/Button";
import { MAX_IMAGE_SIZE, SUPPORTED_IMAGE_TYPE } from "utils/constants";
import { useToast } from "hooks/useToast";
import { useFormik } from "formik";
import { updateWorkspaceGeneral } from "utils/validators";
import { BiErrorCircle } from "react-icons/bi";
import { kontenbase } from "lib/client";
import { useAppDispatch } from "hooks/useAppDispatch";
import { updateWorkspace } from "features/workspaces";
import { SettingsModalRouteState } from "types";
import LeaveWorkspace from "./LeaveWorkspace";
import DeleteWorkspace from "./DeleteWorkspace";

type TypeInitialValues = {
  name: string;
  logo?: File | null | undefined;
};

type TProps = {
  currentRoute: SettingsModalRouteState;
  setCurrentRoute: Dispatch<SetStateAction<SettingsModalRouteState>>;
};

function GeneralSettings({ currentRoute, setCurrentRoute }: TProps) {
  const params = useParams();

  const [showToast] = useToast();

  const workspace = useAppSelector((state) => state.workspace);
  const auth = useAppSelector((state) => state.auth);

  const dispatch = useAppDispatch();

  const [logoPreview, setLogoPreview] = useState(null);

  const workspaceData = useMemo(() => {
    return workspace.workspaces.find((data) => data._id === params.workspaceId);
  }, [workspace.workspaces, params.workspaceId]);

  const userData = useMemo(() => {
    return auth.user;
  }, [auth.user]);

  const showLeaveWorkspace = useMemo(() => {
    return currentRoute.current === "leaveWorkspace";
  }, [currentRoute]);

  const showDeleteWorkspace = useMemo(() => {
    return currentRoute.current === "deleteWorkspace";
  }, [currentRoute]);

  const isAdmin = useMemo(() => {
    return workspaceData.createdBy?._id === auth.user?._id;
  }, [workspaceData, auth.user._id]);

  const initialValues: TypeInitialValues = {
    name: workspaceData.name,
  };

  const formik = useFormik({
    initialValues,
    validationSchema: updateWorkspaceGeneral,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  const beforeUpload = (file: File) => {
    const isImage = SUPPORTED_IMAGE_TYPE.includes(file.type);
    if (!isImage) {
      // showToast({ message: "Only supported JPG/PNG file" });
      formik.setFieldError("logo", "Only supported JPG/PNG file");
    }
    const isOverSize = file.size / 1024 / 1024 < MAX_IMAGE_SIZE;
    if (!isOverSize) {
      // showToast({ message: `Can't upload beyond ${MAX_IMAGE_SIZE}MB` });
      formik.setFieldError("logo", `Can't upload beyond ${MAX_IMAGE_SIZE}MB`);
    }

    return isImage && isOverSize;
  };

  const uploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file: File = e.target.files[0];
    const check = beforeUpload(file);
    if (check) {
      formik.setFieldValue("logo", e.target.files[0]);
      getBase64(e.target.files[0], (result) => {
        setLogoPreview(result);
        dispatch(updateWorkspace({ _id: workspaceData._id, logo: result }));
      });

      try {
        const name = `${workspaceData.name
          .toString()
          .toLowerCase()
          .replace("/s/g", "-")}-logo`;

        const resized = await resizeFile(file, 500);
        const { data: uploadImage, error: uploadError } =
          await kontenbase.storage.upload(resized);
        if (uploadError) throw new Error(uploadError?.message);

        const createAttachment = await kontenbase
          .service("Attachments")
          .create({
            name,
            ext: uploadImage.mimeType,
            file: uploadImage.url,
          });

        const { error: createError } = await kontenbase
          .service("Workspaces")
          .link(params.workspaceId, {
            logo: createAttachment.data._id,
          });
        if (createError) throw new Error(createError?.message);
      } catch (error) {
        console.log("err", error);
        showToast({ message: `${JSON.stringify(error)}` });
      }
    }
  };

  const onSubmit = async (values: { name: string; logo?: File }) => {
    try {
      const { error } = await kontenbase
        .service("Workspaces")
        .updateById(workspaceData._id, {
          name: values.name,
        });

      if (error) throw new Error(error?.message);

      dispatch(updateWorkspace({ _id: workspaceData._id, name: values.name }));
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${JSON.stringify(error)}` });
    }
  };
  const isDisabled: boolean =
    !formik.values.name ||
    !!formik.errors.name ||
    !!formik.errors.logo ||
    !isAdmin;

  return (
    <div className="min-h-[50vh]">
      {currentRoute.current === "general" && (
        <form onSubmit={formik.handleSubmit}>
          <div className="border-b border-neutral-100 pb-5">
            <p className="text-sm font-semibold">Logo</p>
            <div className="my-5">
              <div className="flex items-end ">
                <div className="h-24 w-24 rounded-xl bg-[#a8a8a8] flex items-center justify-center overflow-hidden">
                  {!logoPreview && !workspaceData.logo && (
                    <p className="text-6xl text-white uppercase">
                      {getNameInitial(workspaceData.name)}
                    </p>
                  )}
                  {(logoPreview || workspaceData?.logo) && (
                    <img
                      src={logoPreview || workspaceData?.logo}
                      alt="logo"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="ml-5 ">
                  <Upload onChange={uploadFile} disabled={!isAdmin}>
                    <span className="text-sm font-semibold">Upload logo</span>
                  </Upload>
                  <p className="text-sm text-neutral-500 my-3">
                    Pick an image up to 4MB
                  </p>
                </div>
              </div>
              {formik.errors.logo && (
                <div className="flex gap-2 items-center mt-2">
                  <BiErrorCircle size={20} className="text-red-700" />
                  <p className="text-sm -mb-1">{formik.errors.logo}</p>
                </div>
              )}
            </div>
            <p className="text-sm font-semibold">Workspace name</p>
            <div className="flex flex-col">
              <TextInput
                className="max-w-sm"
                defaultValue={workspaceData.name}
                onBlur={formik.handleBlur("name")}
                onChange={formik.handleChange("name")}
                value={formik.values.name}
                disabled={!isAdmin}
              />
              <small className="text-neutral-500 text-xs mt-2">
                The name of your group or company. Keep it simple.
              </small>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold my-5">Danger zone</h3>
            <div className="my-5">
              <p className="text-sm font-semibold mb-2">Leave workspace</p>
              <p className="text-sm">
                By leaving, you'll immediately have no access to the{" "}
                <span className="font-bold">{workspaceData.name}</span>. You wil
                need to be re-invited to join again.{" "}
                <span className="text-indigo-500 hover:underline cursor-pointer">
                  Learn more.
                </span>
              </p>
              <Button
                className="border border-red-400 text-sm text-red-500 font-semibold hover:border-red-700 hover:text-red-700 mt-2"
                onClick={() => {
                  setCurrentRoute((prev) => ({
                    ...prev,
                    current: "leaveWorkspace",
                  }));
                }}
              >
                Leave workspace
              </Button>
            </div>
            {workspaceData?.createdBy?._id === userData.id && (
              <div>
                <p className="text-sm font-semibold mb-2">Delete workspace</p>
                <p className="text-sm">
                  This will immediately and permanently delete the{" "}
                  <span className="font-bold">{workspaceData.name}</span>{" "}
                  workspace and its data for everyone — including all channels,
                  threads, messages, and files. This cannot be undone.{" "}
                  <span className="text-indigo-500 hover:underline cursor-pointer">
                    Learn more.
                  </span>
                </p>
                <Button
                  className="border border-red-400 text-sm text-red-500 font-semibold hover:border-red-700 hover:text-red-700 mt-2"
                  onClick={() => {
                    setCurrentRoute((prev) => ({
                      ...prev,
                      current: "deleteWorkspace",
                    }));
                  }}
                >
                  Delete workspace
                </Button>
              </div>
            )}
          </div>

          {formik.values.name !== workspaceData.name && (
            <div className="w-full h-14 mt-10 flex items-center  justify-end p-1">
              <div className="flex items-center justify-end gap-2">
                <Button
                  className="text-sm flex items-center justify-center hover:bg-neutral-50 min-w-[5rem]"
                  onClick={() =>
                    formik.setFieldValue("name", workspaceData.name)
                  }
                >
                  Cancel
                </Button>
                <Button
                  className="text-sm flex items-center justify-center bg-indigo-500 min-w-[5rem] text-white"
                  disabled={isDisabled}
                  type="submit"
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
      {showLeaveWorkspace && <LeaveWorkspace />}
      {showDeleteWorkspace && <DeleteWorkspace />}
    </div>
  );
}

export default GeneralSettings;
