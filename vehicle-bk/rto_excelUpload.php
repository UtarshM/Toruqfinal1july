<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );

require( 'library/php-excel-reader/excel_reader2.php' );
require( 'library/SpreadsheetReader.php' );

if ( isset( $_POST[ 'submit_rto_excel' ] ) ) {
  $mimes = [ 'application/vnd.ms-excel', 'text/xls', 'text/xlsx', 'application/vnd.oasis.opendocument.spreadsheet' ];
  if ( in_array( $_FILES[ "file" ][ "type" ], $mimes ) ) {
    $curt_time = date('d-m-Y-h-i-s-', time());
    $uploadFilePath = 'uploads_rto_excel/' .$curt_time. basename( $_FILES[ 'file' ][ 'name' ] );
    move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $uploadFilePath );
    $Reader = new SpreadsheetReader( $uploadFilePath );
    $totalSheet = count( $Reader->sheets() );
    $isheader = 0;
    /* For Loop for all sheets */
    for ( $i = 0; $i < $totalSheet; $i++ ) {
      $Reader->ChangeSheet( $i );
      foreach ( $Reader as $Row )
      {
         if ( $isheader > 0 ) {
          $rot_reg_no = isset( $Row[ 0 ] ) ? $Row[ 0 ] : '';
          $rot_name = isset( $Row[ 1 ] ) ? $Row[ 1 ] : '';
          $rot_contact = isset( $Row[ 2 ] ) ? $Row[ 2 ] : '';
          $rot_vmodel = isset( $Row[ 3 ] ) ? $Row[ 3 ] : '';
          $service_id = isset( $Row[ 4 ] ) ? $Row[ 4 ] : '';
          $rot_fname = isset( $Row[ 5 ] ) ? $Row[ 5 ] : '';
          $rot_address = isset( $Row[ 6 ] ) ? $Row[ 6 ] : '';
          $rot_appoinment = isset( $Row[ 7 ] ) ? $Row[ 7 ] : '';
          if(empty($rot_appoinment)){ $rot_appoinment = NULL; } else{ $rot_appoinment = date('Y-m-d', strtotime($rot_appoinment)); }
          $rot_reg_date = isset( $Row[ 8 ] ) ? $Row[ 8 ] : '';
          if(empty($rot_reg_date)){ $rot_reg_date = NULL; } else{ $rot_reg_date = date('Y-m-d', strtotime($rot_reg_date)); }
          $rot_exp_date = isset( $Row[ 9 ] ) ? $Row[ 9 ] : '';
          if(empty($rot_exp_date)){ $rot_exp_date = NULL; } else{ $rot_exp_date = date('Y-m-d', strtotime($rot_exp_date)); }
          $rot_remarks = isset( $Row[ 10 ] ) ? $Row[ 10 ] : '';
          // echo $rot_nat_permit_date; exit;
          $s_max = "SELECT MAX( rot_id ) AS max FROM `rto_detail`";
          $result_max = $con->query($s_max);
          $row_max = $result_max->fetch_object();
          $max_rot_id = $row_max->max + 1;
          $rot_code_no = "RTO".$max_rot_id;
         
          $query_rot_dup = "SELECT * FROM rto_detail where rot_reg_no='".$rot_reg_no."' and rot_status!='3'";
          $result_rot_dup = $con->query( $query_rot_dup );
          $total_records_rot_dup = $result_rot_dup->num_rows;
          // echo $total_records_rot_dup; exit;
          // echo $total_records_rot_dup; exit;
          if ( $total_records_rot_dup >= 1 ) {
            // echo "ALREADY EXIST";
            
            $rot_date = date( 'Y-m-d H:i:s' );
            $updated_by = $_SESSION[ 'adm_id' ];
            $updated_date = date( 'Y-m-d H:i:s' );
            if($rot_name!="" && $rot_vmodel!="" && $rot_reg_no!="") {
            // UPDATE RECORD 
            $sql_expe_updt = "UPDATE rto_detail SET rot_date='" . $rot_date . "', rot_name='" . $rot_name."', rot_fname='" . $rot_fname."', rot_address='" . $rot_address."', rot_contact='".$rot_contact."', service_id='".$service_id."', rot_reg_no='".$rot_reg_no."', rot_vmodel='".$rot_vmodel."',  rot_appoinment='" . $rot_appoinment . "', rot_reg_date='" . $rot_reg_date . "', rot_exp_date='" . $rot_exp_date . "',   rot_remarks='".$rot_remarks."', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE rot_reg_no='".$rot_reg_no."'";
            $con->query( $sql_expe_updt );
            }

            // UPDATE RECORD 
          } else {
            echo "New";
            // INSERT RECORD
            $rot_adm_id=0;
            $branch_id = $_SESSION[ 'adm_branch' ];
            $rot_status = 1;
            $rot_date = date( 'Y-m-d H:i:s' );
            $added_date = date( 'Y-m-d H:i:s' );
            $updated_date = date( 'Y-m-d H:i:s' );
            $added_by = $_SESSION[ 'adm_id' ];
            $updated_by = $_SESSION[ 'adm_id' ];
            if($rot_name!="" && $rot_vmodel!="" && $rot_reg_no!="") {
            $sql_expe_ins = "INSERT INTO rto_detail (rot_adm_id, branch_id, rot_code_no,  rot_date, rot_name, rot_fname, rot_address, rot_contact, rot_reg_no, rot_vmodel, service_id, rot_appoinment, rot_reg_date, rot_exp_date,  rot_remarks, added_by, updated_by, rot_status, added_date, updated_date) VALUES ('" . $rot_adm_id . "','" . $branch_id . "','" . $rot_code_no . "','" . $rot_date . "','" . $rot_name . "','" . $rot_fname . "','" . $rot_address . "','" . $rot_contact . "','" . $rot_reg_no . "','" . $rot_vmodel . "','" . $service_id . "','" . $rot_appoinment . "', '" . $rot_reg_date . "','" . $rot_exp_date . "', '" . $rot_remarks . "','" . $added_by . "','" . $updated_by . "','" . $rot_status . "','" . $added_date . "','" . $updated_date . "')";
            $con->query( $sql_expe_ins );
            }
            // INSERT RECORD
            // echo $sql_expe_ins; exit;
          }
        } else {
          $isheader = 1;
        }
        
      }
      // exit;
    }
    header('Location: rto_view.php?flag=1');
  } else {
    header('Location: rto_view.php?flag=4');
  }
}
?>